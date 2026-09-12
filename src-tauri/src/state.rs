use crate::commands::ws::WsHandle;
use sqlx::SqlitePool;
use std::collections::HashMap;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: SqlitePool,
    pub ws_connections: Mutex<HashMap<String, WsHandle>>,
}
