// Скрывает лишнее консольное окно на Windows 10/11 в release-сборке
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tikzarium_studio_tauri_lib::run();
}
