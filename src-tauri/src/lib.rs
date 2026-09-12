mod commands;
mod db;
mod error;
mod models;
mod state;

use commands::{environments, history, http, import_export, saved_requests, variables, ws};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
