use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValueEntry {
    pub key: String,
    pub value: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

pub fn parse_kv_list(raw: &str) -> Vec<KeyValueEntry> {
    serde_json::from_str(raw).unwrap_or_default()
}

pub fn serialize_kv_list(entries: &[KeyValueEntry]) -> String {
    serde_json::to_string(entries).unwrap_or_else(|_| "[]".to_string())
}

// ---------- Environments ----------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

// ---------- Variables ----------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Variable {
    pub id: String,
    pub environment_id: Option<String>,
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpsertVariableInput {
    pub id: Option<String>,
    pub environment_id: Option<String>,
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub enabled: bool,
}

// ---------- Saved requests ----------

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SavedRequestKind {
    Http,
    Ws,
}

impl SavedRequestKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            SavedRequestKind::Http => "http",
            SavedRequestKind::Ws => "ws",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "ws" => SavedRequestKind::Ws,
            _ => SavedRequestKind::Http,
        }
    }
}

#[derive(sqlx::FromRow)]
pub struct SavedRequestRow {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub method: Option<String>,
    pub url: String,
    pub headers: String,
    pub query_params: String,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedRequest {
    pub id: String,
    pub kind: SavedRequestKind,
    pub name: String,
    pub method: Option<String>,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub query_params: Vec<KeyValueEntry>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SavedRequestRow> for SavedRequest {
    fn from(row: SavedRequestRow) -> Self {
        SavedRequest {
            id: row.id,
            kind: SavedRequestKind::from_str(&row.kind),
            name: row.name,
            method: row.method,
            url: row.url,
            headers: parse_kv_list(&row.headers),
            query_params: parse_kv_list(&row.query_params),
            body: row.body,
            body_type: row.body_type,
            ws_init_message: row.ws_init_message,
            sort_order: row.sort_order,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SavedRequestInput {
    pub kind: SavedRequestKind,
    pub name: String,
    pub method: Option<String>,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub query_params: Vec<KeyValueEntry>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
}

// ---------- Tabs ----------

#[derive(sqlx::FromRow)]
pub struct TabRow {
    pub id: String,
    pub kind: String,
    pub saved_request_id: Option<String>,
    pub sort_order: i64,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub query_params: String,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
    pub status_code: Option<i64>,
    pub status_text: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub response_body_encoding: String,
    pub response_size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tab {
    pub id: String,
    pub kind: SavedRequestKind,
    pub saved_request_id: Option<String>,
    pub sort_order: i64,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub query_params: Vec<KeyValueEntry>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
    pub status_code: Option<i64>,
    pub status_text: Option<String>,
    pub response_headers: Vec<KeyValueEntry>,
    pub response_body: Option<String>,
    pub response_body_encoding: String,
    pub response_size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TabRow> for Tab {
    fn from(row: TabRow) -> Self {
        Tab {
            id: row.id,
            kind: SavedRequestKind::from_str(&row.kind),
            saved_request_id: row.saved_request_id,
            sort_order: row.sort_order,
            name: row.name,
            method: row.method,
            url: row.url,
            headers: parse_kv_list(&row.headers),
            query_params: parse_kv_list(&row.query_params),
            body: row.body,
            body_type: row.body_type,
            ws_init_message: row.ws_init_message,
            status_code: row.status_code,
            status_text: row.status_text,
            response_headers: row
                .response_headers
                .map(|h| parse_kv_list(&h))
                .unwrap_or_default(),
            response_body: row.response_body,
            response_body_encoding: row.response_body_encoding,
            response_size_bytes: row.response_size_bytes,
            duration_ms: row.duration_ms,
            error_message: row.error_message,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpsertTabInput {
    pub id: String,
    pub kind: SavedRequestKind,
    pub saved_request_id: Option<String>,
    pub sort_order: i64,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub query_params: Vec<KeyValueEntry>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub ws_init_message: Option<String>,
    pub status_code: Option<i64>,
    pub status_text: Option<String>,
    pub response_headers: Vec<KeyValueEntry>,
    pub response_body: Option<String>,
    pub response_body_encoding: String,
    pub response_size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
}

// ---------- HTTP history ----------

#[derive(sqlx::FromRow)]
pub struct HistoryRequestRow {
    pub id: String,
    pub saved_request_id: Option<String>,
    pub environment_id: Option<String>,
    pub method: String,
    pub url: String,
    pub request_headers: String,
    pub request_body: Option<String>,
    pub status_code: Option<i64>,
    pub status_text: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub response_body_encoding: String,
    pub response_size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
    pub sent_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoryRequest {
    pub id: String,
    pub saved_request_id: Option<String>,
    pub environment_id: Option<String>,
    pub method: String,
    pub url: String,
    pub request_headers: Vec<KeyValueEntry>,
    pub request_body: Option<String>,
    pub status_code: Option<i64>,
    pub status_text: Option<String>,
    pub response_headers: Vec<KeyValueEntry>,
    pub response_body: Option<String>,
    pub response_body_encoding: String,
    pub response_size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub error_message: Option<String>,
    pub sent_at: String,
}

impl From<HistoryRequestRow> for HistoryRequest {
    fn from(row: HistoryRequestRow) -> Self {
        HistoryRequest {
            id: row.id,
            saved_request_id: row.saved_request_id,
            environment_id: row.environment_id,
            method: row.method,
            url: row.url,
            request_headers: parse_kv_list(&row.request_headers),
            request_body: row.request_body,
            status_code: row.status_code,
            status_text: row.status_text,
            response_headers: row
                .response_headers
                .map(|h| parse_kv_list(&h))
                .unwrap_or_default(),
            response_body: row.response_body,
            response_body_encoding: row.response_body_encoding,
            response_size_bytes: row.response_size_bytes,
            duration_ms: row.duration_ms,
            error_message: row.error_message,
            sent_at: row.sent_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendHttpRequestInput {
    pub method: String,
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub timeout_ms: Option<u64>,
    #[serde(default)]
    pub danger_accept_invalid_certs: bool,
    #[serde(default = "default_true")]
    pub follow_redirects: bool,
    pub saved_request_id: Option<String>,
    pub environment_id_for_log: Option<String>,
}

// ---------- WS history ----------

#[derive(sqlx::FromRow, Debug, Clone, Serialize)]
pub struct WsSessionRow {
    pub id: String,
    pub saved_request_id: Option<String>,
    pub environment_id: Option<String>,
    pub url: String,
    pub request_headers: String,
    pub connected_at: String,
    pub disconnected_at: Option<String>,
    pub close_code: Option<i64>,
    pub close_reason: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsSession {
    pub id: String,
    pub saved_request_id: Option<String>,
    pub environment_id: Option<String>,
    pub url: String,
    pub request_headers: Vec<KeyValueEntry>,
    pub connected_at: String,
    pub disconnected_at: Option<String>,
    pub close_code: Option<i64>,
    pub close_reason: Option<String>,
    pub error_message: Option<String>,
}

impl From<WsSessionRow> for WsSession {
    fn from(row: WsSessionRow) -> Self {
        WsSession {
            id: row.id,
            saved_request_id: row.saved_request_id,
            environment_id: row.environment_id,
            url: row.url,
            request_headers: parse_kv_list(&row.request_headers),
            connected_at: row.connected_at,
            disconnected_at: row.disconnected_at,
            close_code: row.close_code,
            close_reason: row.close_reason,
            error_message: row.error_message,
        }
    }
}

#[derive(sqlx::FromRow, Debug, Clone, Serialize)]
pub struct WsMessage {
    pub id: String,
    pub session_id: String,
    pub direction: String,
    pub message_type: String,
    pub payload: String,
    pub payload_encoding: String,
    pub size_bytes: i64,
    pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsSessionDetail {
    pub session: WsSession,
    pub messages: Vec<WsMessage>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WsConnectInput {
    pub url: String,
    pub headers: Vec<KeyValueEntry>,
    pub saved_request_id: Option<String>,
    pub environment_id_for_log: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WsMessageType {
    Text,
    Binary,
}
