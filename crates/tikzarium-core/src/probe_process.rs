//! Bounded, read-only discovery children. No shell, installer, or token changes.
//! Files avoid pipe deadlocks (including inherited pipes); reads are capped.
use std::{
    fs::File,
    io::{self, Read, Seek, SeekFrom},
    process::{Child, Command, Output, Stdio},
    thread,
    time::{Duration, Instant},
};

const MAX_PROBE_OUTPUT: u64 = 256 * 1024;

struct OwnedChild(Child);

impl Drop for OwnedChild {
    fn drop(&mut self) {
        if !matches!(self.0.try_wait(), Ok(Some(_))) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
}

fn read_capped(file: &mut File) -> io::Result<Vec<u8>> {
    file.seek(SeekFrom::Start(0))?;
    let mut bytes = Vec::new();
    file.take(MAX_PROBE_OUTPUT + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > MAX_PROBE_OUTPUT {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "TeX discovery output exceeded 256 KiB",
        ));
    }
    Ok(bytes)
}

pub(crate) fn run_probe(command: &mut Command, timeout: Duration) -> io::Result<Output> {
    crate::windows_tex_security::require_safe_tex_child()?;
    if timeout.is_zero() {
        return Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "TeX discovery deadline exhausted",
        ));
    }
    let mut stdout = tempfile::tempfile()?;
    let mut stderr = tempfile::tempfile()?;
    command
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout.try_clone()?))
        .stderr(Stdio::from(stderr.try_clone()?));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // Console helpers must not flash consoles or disrupt the native GUI's focus.
        // CREATE_NO_WINDOW changes window presentation, NOT privileges or policy.
        command.creation_flags(0x0800_0000);
    }
    let started = Instant::now();
    let mut child = OwnedChild(command.spawn()?);
    loop {
        if stdout.metadata()?.len() > MAX_PROBE_OUTPUT
            || stderr.metadata()?.len() > MAX_PROBE_OUTPUT
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "TeX discovery output exceeded 256 KiB",
            ));
        }
        if let Some(status) = child.0.try_wait()? {
            return Ok(Output {
                status,
                stdout: read_capped(&mut stdout)?,
                stderr: read_capped(&mut stderr)?,
            });
        }
        if started.elapsed() >= timeout {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "TeX discovery child exceeded its deadline",
            ));
        }
        thread::sleep(Duration::from_millis(20).min(timeout.saturating_sub(started.elapsed())));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn helper(mode: &str, timeout: Duration) -> io::Result<Output> {
        let mut command = Command::new(std::env::current_exe()?);
        command
            .args([
                "--exact",
                "probe_process::tests::probe_child",
                "--ignored",
                "--nocapture",
            ])
            .env("TIKZARIUM_TEST_PROBE_MODE", mode);
        run_probe(&mut command, timeout)
    }

    // Invoked only as an owned child by these tests, never by normal discovery.
    #[test]
    #[ignore]
    fn probe_child() {
        match std::env::var("TIKZARIUM_TEST_PROBE_MODE").as_deref() {
            Ok("success") => {
                println!("MiKTeX test identity");
                eprintln!("retained warning");
            }
            Ok("nonzero") => std::process::exit(7),
            Ok("sleep") => thread::sleep(Duration::from_secs(10)),
            Ok("overflow") => println!("{}", "x".repeat(MAX_PROBE_OUTPUT as usize + 1)),
            #[cfg(windows)]
            Ok("console") => {
                #[link(name = "kernel32")]
                unsafe extern "system" {
                    fn GetConsoleWindow() -> *mut std::ffi::c_void;
                }
                assert!(
                    unsafe { GetConsoleWindow() }.is_null(),
                    "probe unexpectedly owns a console window"
                );
                println!("PROBE_HAS_NO_CONSOLE_WINDOW");
            }
            other => panic!("unknown isolated test probe: {other:?}"),
        }
    }

    #[test]
    fn bounded_probe_retains_stdout_stderr_and_success() {
        let result = helper("success", Duration::from_secs(5)).unwrap();
        assert!(result.status.success());
        assert!(String::from_utf8_lossy(&result.stdout).contains("MiKTeX test identity"));
        assert!(String::from_utf8_lossy(&result.stderr).contains("retained warning"));
    }
    #[test]
    fn bounded_probe_preserves_real_failure_exit() {
        assert_eq!(
            helper("nonzero", Duration::from_secs(5))
                .unwrap()
                .status
                .code(),
            Some(7)
        );
    }
    #[test]
    fn stalled_probe_is_terminated_instead_of_blocking_discovery() {
        let started = Instant::now();
        assert_eq!(
            helper("sleep", Duration::from_millis(150))
                .unwrap_err()
                .kind(),
            io::ErrorKind::TimedOut
        );
        assert!(started.elapsed() < Duration::from_secs(5));
    }
    #[test]
    fn excessive_probe_output_is_rejected_not_truncated_into_identity() {
        assert_eq!(
            helper("overflow", Duration::from_secs(5))
                .unwrap_err()
                .kind(),
            io::ErrorKind::InvalidData
        );
    }
    #[test]
    fn zero_deadline_does_not_spawn() {
        let mut command = Command::new("never-execute-this-probe");
        assert_eq!(
            run_probe(&mut command, Duration::ZERO).unwrap_err().kind(),
            io::ErrorKind::TimedOut
        );
    }
    #[cfg(windows)]
    #[test]
    fn real_windows_probe_has_no_console_window() {
        let result = helper("console", Duration::from_secs(5)).unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        assert!(String::from_utf8_lossy(&result.stdout).contains("PROBE_HAS_NO_CONSOLE_WINDOW"));
    }
}
