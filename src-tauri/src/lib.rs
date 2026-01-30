use std::path::PathBuf;
use tauri::Emitter;
mod file_ops;
use serde_json;
use tauri::{Manager, RunEvent, Url};
use tauri_plugin_store::StoreBuilder;

fn collect_cli_files() -> Vec<PathBuf> {
    let mut files = Vec::new();

    for maybe_file in std::env::args().skip(1) {
        if maybe_file.starts_with('-') {
            continue;
        }

        if let Ok(url) = Url::parse(&maybe_file) {
            if let Ok(path) = url.to_file_path() {
                files.push(path);
            }
        } else {
            files.push(PathBuf::from(maybe_file));
        }
    }

    files
}

fn handle_file_associations(app: &tauri::AppHandle, files: Vec<PathBuf>) {
    if files.is_empty() {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        let paths: Vec<String> = files
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect();

        window.emit("open-files", paths).ok();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                let launch_files = std::env::args().collect::<Vec<_>>();
                let store = tauri_plugin_store::StoreBuilder::new(app, "launch.json")
                    .build()
                    .unwrap();
                store.set("pending_files", serde_json::to_value(launch_files).unwrap());
                store.save().unwrap();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            file_ops::load_media,
            file_ops::scan_folder,
            file_ops::scan_folder_alt,
            file_ops::get_media_size,
            file_ops::get_media_url,
            file_ops::get_image_bytes,
            file_ops::copy_media_to_folder
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
