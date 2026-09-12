mod commands;
mod db;
mod error;
mod models;
mod state;

use commands::{environments, history, http, import_export, saved_requests, tabs, variables, ws};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let pool = tauri::async_runtime::block_on(db::init_pool(&handle))
                .expect("failed to initialize database");
            app.manage(AppState {
                db: pool,
                ws_connections: Default::default(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            environments::list_environments,
            environments::create_environment,
            environments::rename_environment,
            environments::delete_environment,
            environments::set_active_environment,
            environments::get_active_environment,
            variables::list_variables,
            variables::upsert_variable,
            variables::delete_variable,
            saved_requests::list_saved_requests,
            saved_requests::get_saved_request,
            saved_requests::create_saved_request,
            saved_requests::update_saved_request,
            saved_requests::delete_saved_request,
            saved_requests::reorder_saved_requests,
            tabs::list_tabs,
            tabs::upsert_tab,
            tabs::delete_tab,
            tabs::set_active_tab_id,
            tabs::get_active_tab_id,
            http::send_http_request,
            ws::ws_connect,
            ws::ws_send,
            ws::ws_disconnect,
            history::list_http_history,
            history::get_http_history_entry,
            history::delete_http_history_entry,
            history::clear_http_history,
            history::list_ws_history,
            history::get_ws_history_session,
            history::delete_ws_history_session,
            history::clear_ws_history,
            import_export::export_data,
            import_export::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
