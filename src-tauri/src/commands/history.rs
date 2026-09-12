use crate::error::{AppError, AppResult};
use crate::models::{
    HistoryRequest, HistoryRequestRow, WsMessage, WsSession, WsSessionDetail, WsSessionRow,
};
use crate::state::AppState;
use serde::Serialize;
use tauri::State;

const HISTORY_COLUMNS: &str = "id, saved_request_id, environment_id, method, url, request_headers, request_body, status_code, status_text, response_headers, response_body, response_body_encoding, response_size_bytes, duration_ms, error_message, sent_at";

#[derive(Debug, Clone, Serialize)]
pub struct HistoryRequestSummary {
    pub id: String,
    pub saved_request_id: Option<String>,
    pub method: String,
    pub url: String,
    pub status_code: Option<i64>,
    pub duration_ms: Option<i64>,
    pub response_size_bytes: Option<i64>,
    pub error_message: Option<String>,
    pub sent_at: String,
}

impl From<HistoryRequest> for HistoryRequestSummary {
    fn from(h: HistoryRequest) -> Self {
        HistoryRequestSummary {
            id: h.id,
            saved_request_id: h.saved_request_id,
            method: h.method,
            url: h.url,
            status_code: h.status_code,
            duration_ms: h.duration_ms,
            response_size_bytes: h.response_size_bytes,
            error_message: h.error_message,
            sent_at: h.sent_at,
        }
    }
}

#[tauri::command]
pub async fn list_http_history(
    state: State<'_, AppState>,
    limit: i64,
    offset: i64,
    search: Option<String>,
) -> AppResult<Vec<HistoryRequestSummary>> {
    let rows = match search.filter(|s| !s.trim().is_empty()) {
        Some(term) => {
            let pattern = format!("%{term}%");
            sqlx::query_as::<_, HistoryRequestRow>(&format!(
                "SELECT {HISTORY_COLUMNS} FROM history_requests WHERE url LIKE ? ORDER BY sent_at DESC LIMIT ? OFFSET ?"
            ))
            .bind(pattern)
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as::<_, HistoryRequestRow>(&format!(
                "SELECT {HISTORY_COLUMNS} FROM history_requests ORDER BY sent_at DESC LIMIT ? OFFSET ?"
            ))
            .bind(limit)
            .bind(offset)
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(rows
        .into_iter()
        .map(HistoryRequest::from)
        .map(HistoryRequestSummary::from)
        .collect())
}

#[tauri::command]
pub async fn get_http_history_entry(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<HistoryRequest> {
    let row = sqlx::query_as::<_, HistoryRequestRow>(&format!(
        "SELECT {HISTORY_COLUMNS} FROM history_requests WHERE id = ?"
    ))
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(row.into())
}

#[tauri::command]
pub async fn delete_http_history_entry(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM history_requests WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_http_history(state: State<'_, AppState>) -> AppResult<()> {
    sqlx::query("DELETE FROM history_requests")
        .execute(&state.db)
        .await?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct WsSessionSummary {
    #[serde(flatten)]
    pub session: WsSession,
    pub message_count: i64,
}

#[tauri::command]
pub async fn list_ws_history(
    state: State<'_, AppState>,
    limit: i64,
    offset: i64,
) -> AppResult<Vec<WsSessionSummary>> {
    let rows = sqlx::query_as::<_, WsSessionRow>(
        "SELECT id, saved_request_id, environment_id, url, request_headers, connected_at, disconnected_at, close_code, close_reason, error_message
         FROM history_ws_sessions ORDER BY connected_at DESC LIMIT ? OFFSET ?",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let mut summaries = Vec::with_capacity(rows.len());
    for row in rows {
        let session: WsSession = row.into();
        let (count,): (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM history_ws_messages WHERE session_id = ?")
                .bind(&session.id)
                .fetch_one(&state.db)
                .await?;
        summaries.push(WsSessionSummary {
            session,
            message_count: count,
        });
    }
    Ok(summaries)
}

#[tauri::command]
pub async fn get_ws_history_session(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<WsSessionDetail> {
    let row = sqlx::query_as::<_, WsSessionRow>(
        "SELECT id, saved_request_id, environment_id, url, request_headers, connected_at, disconnected_at, close_code, close_reason, error_message
         FROM history_ws_sessions WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    let messages = sqlx::query_as::<_, WsMessage>(
        "SELECT id, session_id, direction, message_type, payload, payload_encoding, size_bytes, occurred_at
         FROM history_ws_messages WHERE session_id = ? ORDER BY occurred_at ASC",
    )
    .bind(&id)
    .fetch_all(&state.db)
    .await?;

    Ok(WsSessionDetail {
        session: row.into(),
        messages,
    })
}

#[tauri::command]
pub async fn delete_ws_history_session(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM history_ws_sessions WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_ws_history(state: State<'_, AppState>) -> AppResult<()> {
    sqlx::query("DELETE FROM history_ws_sessions")
        .execute(&state.db)
        .await?;
    Ok(())
}
