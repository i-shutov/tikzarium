//! Библиотечная точка входа десктопного приложения `TikZarium Studio` (Tauri v2 + Rust).

pub mod commands;
pub mod patch_engine;

use commands::StudioTauriState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(StudioTauriState::default())
        .invoke_handler(tauri::generate_handler![
            commands::tz_runtime_info,
            commands::tz_render_pdf_underlay,
            commands::tz_cancel_active_build,
            commands::tz_doctor_environment,
            commands::tz_open_document,
            commands::tz_save_document,
            commands::tz_apply_checked_patch,
            commands::tz_render_manual_page,
            commands::tz_resolve_manual_token,
        ])
        .run(tauri::generate_context!())
        .expect("ошибка запуска нативного окна TikZarium Studio (Tauri v2)");
}
