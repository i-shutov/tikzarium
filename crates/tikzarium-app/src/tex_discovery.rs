//! Read-only environment discovery must never run on the native event-loop thread.
use eframe::egui;
use std::{
    collections::BTreeMap,
    sync::mpsc::{self, Receiver},
    time::{Duration, Instant},
};
use tikzarium_core::{PackageProbe, TexEnvironment};
use tikzarium_extensions::{ExtensionStatus, Registry, primitives::Evidence};

pub(crate) struct Snapshot {
    pub tex: TexEnvironment,
    pub packages: Vec<ExtensionStatus>,
    pub libraries: BTreeMap<String, Evidence>,
    pub elapsed: Duration,
}

impl Snapshot {
    /// Pure metadata only: UNKNOWN is not "package missing" and spawns nothing.
    pub fn unknown() -> Self {
        let registry = Registry::new().expect("built-in extension manifests must validate");
        Self {
            tex: TexEnvironment {
                xelatex: None,
                xelatex_version: None,
                kpsewhich: None,
                pdf_renderer: None,
            },
            packages: registry.status_with_lookup(|_| None),
            libraries: tikzarium_extensions::project_imports::library_installations_with_lookup(
                crate::tikz_authoring::catalog(),
                |_| PackageProbe::Unavailable,
            ),
            elapsed: Duration::ZERO,
        }
    }

    fn discover() -> Self {
        let started = Instant::now();
        let tex = TexEnvironment::discover();
        let registry = Registry::new().expect("built-in extension manifests must validate");
        let packages = registry.status(&tex);
        let libraries = tikzarium_extensions::project_imports::probe_library_installations(
            crate::tikz_authoring::catalog(),
            &tex,
        );
        Self {
            tex,
            packages,
            libraries,
            elapsed: started.elapsed(),
        }
    }
}

pub(crate) fn start(ctx: egui::Context) -> Receiver<Result<Snapshot, String>> {
    start_with(Snapshot::discover, move || ctx.request_repaint())
}

fn start_with(
    discover: impl FnOnce() -> Snapshot + Send + 'static,
    repaint: impl FnOnce() + Send + 'static,
) -> Receiver<Result<Snapshot, String>> {
    let (sender, receiver) = mpsc::channel();
    let worker_sender = sender.clone();
    if let Err(error) = std::thread::Builder::new()
        .name("tikzarium-tex-discovery".into())
        .spawn(move || {
            let snapshot = discover();
            let _ = worker_sender.send(Ok(snapshot));
            repaint();
        })
    {
        let _ = sender.send(Err(format!("Не удалось запустить проверку TeX: {error}")));
    }
    receiver
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::TryRecvError;
    use tikzarium_extensions::InstallationState;

    #[test]
    fn pending_snapshot_never_claims_installed_or_missing() {
        let snapshot = Snapshot::unknown();
        assert!(snapshot.tex.xelatex.is_none());
        assert!(!snapshot.packages.is_empty());
        assert!(
            snapshot
                .packages
                .iter()
                .all(|p| p.installation == InstallationState::Unknown && !p.installed)
        );
        assert!(snapshot.libraries.values().all(|v| *v == Evidence::Unknown));
    }

    #[test]
    fn blocked_discovery_does_not_block_gui_thread_or_polling() {
        let (release, blocked) = mpsc::channel();
        let (entered, started) = mpsc::channel();
        let (repaint, repainted) = mpsc::channel();
        let rx = start_with(
            move || {
                entered.send(()).unwrap();
                blocked.recv().unwrap();
                Snapshot::unknown()
            },
            move || {
                let _ = repaint.send(());
            },
        );
        started.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(matches!(rx.try_recv(), Err(TryRecvError::Empty)));
        // The UI thread can still render source/help while the worker is held.
        let ctx = egui::Context::default();
        let mut frame_ran = false;
        let _ = ctx.run(egui::RawInput::default(), |ctx| {
            egui::CentralPanel::default().show(ctx, |ui| {
                ui.label("Исходник и справка доступны");
                frame_ran = true;
            });
        });
        assert!(frame_ran);
        assert!(matches!(rx.try_recv(), Err(TryRecvError::Empty)));
        release.send(()).unwrap();
        assert!(rx.recv_timeout(Duration::from_secs(5)).unwrap().is_ok());
        repainted.recv_timeout(Duration::from_secs(5)).unwrap();
    }

    #[test]
    fn dropped_window_does_not_panic_when_discovery_finishes() {
        let (release, blocked) = mpsc::channel();
        let (done, finished) = mpsc::channel();
        let rx = start_with(
            move || {
                blocked.recv().unwrap();
                Snapshot::unknown()
            },
            move || {
                let _ = done.send(());
            },
        );
        drop(rx);
        release.send(()).unwrap();
        finished.recv_timeout(Duration::from_secs(5)).unwrap();
    }
}
