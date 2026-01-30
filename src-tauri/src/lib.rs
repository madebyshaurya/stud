// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod bridge;
mod plugin;

use std::thread;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_bridge_status() -> String {
    // This could be enhanced to return actual status
    "running".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start the bridge server in a separate thread with its own tokio runtime
    thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(bridge::start_bridge_server());
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_bridge_status,
            plugin::check_plugin_installed,
            plugin::install_plugin,
            plugin::get_plugins_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
