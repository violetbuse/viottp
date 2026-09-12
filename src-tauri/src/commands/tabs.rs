use crate::error::{AppError, AppResult};
use crate::models::{serialize_kv_list, Tab, TabRow, UpsertTabInput};
use crate::state::AppState;
use chrono::Utc;
use tauri::State;

const SELECT_COLUMNS: &str = "id, kind, saved_request_id, sort_order, name, method, url, headers, query_params, body, body_type, ws_init_message, status_code, status_text, response_headers, response_body, response_body_encoding, response_size_bytes, duration_ms, error_message, created_at, updated_at";

#[tauri::command]
pub async fn list_tabs(state: State<'_, AppState>) -> AppResult<Vec<Tab>> {
    let rows = sqlx::query_as::<_, TabRow>(&format!(
        "SELECT {SELECT_COLUMNS} FROM tabs ORDER BY sort_order ASC, created_at ASC"
    ))
    .fetch_all(&state.db)
    .await?;
    Ok(rows.into_iter().map(Tab::from).collect())
}

async fn get_tab(state: &State<'_, AppState>, id: &str) -> AppResult<Tab> {
    let row = sqlx::query_as::<_, TabRow>(&format!("SELECT {SELECT_COLUMNS} FROM tabs WHERE id = ?"))
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(row.into())
}

#[tauri::command]
pub async fn upsert_tab(state: State<'_, AppState>, input: UpsertTabInput) -> AppResult<Tab> {
    let now = Utc::now().to_rfc3339();
    let headers = serialize_kv_list(&input.headers);
    let query_params = serialize_kv_list(&input.query_params);
    let response_headers = serialize_kv_list(&input.response_headers);

    sqlx::query(
        "INSERT INTO tabs (
            id, kind, saved_request_id, sort_order, name, method, url, headers, query_params,
            body, body_type, ws_init_message, status_code, status_text, response_headers,
            response_body, response_body_encoding, response_size_bytes, duration_ms, error_message,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            kind = excluded.kind,
            saved_request_id = excluded.saved_request_id,
            sort_order = excluded.sort_order,
            name = excluded.name,
            method = excluded.method,
            url = excluded.url,
            headers = excluded.headers,
            query_params = excluded.query_params,
            body = excluded.body,
            body_type = excluded.body_type,
            ws_init_message = excluded.ws_init_message,
            status_code = excluded.status_code,
            status_text = excluded.status_text,
            response_headers = excluded.response_headers,
            response_body = excluded.response_body,
            response_body_encoding = excluded.response_body_encoding,
            response_size_bytes = excluded.response_size_bytes,
            duration_ms = excluded.duration_ms,
            error_message = excluded.error_message,
            updated_at = excluded.updated_at",
    )
    .bind(&input.id)
    .bind(input.kind.as_str())
    .bind(&input.saved_request_id)
    .bind(input.sort_order)
    .bind(&input.name)
    .bind(&input.method)
    .bind(&input.url)
    .bind(&headers)
    .bind(&query_params)
    .bind(&input.body)
    .bind(&input.body_type)
    .bind(&input.ws_init_message)
    .bind(input.status_code)
    .bind(&input.status_text)
    .bind(&response_headers)
    .bind(&input.response_body)
    .bind(&input.response_body_encoding)
    .bind(input.response_size_bytes)
    .bind(input.duration_ms)
    .bind(&input.error_message)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await?;

    get_tab(&state, &input.id).await
}

#[tauri::command]
pub async fn delete_tab(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM tabs WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn set_active_tab_id(state: State<'_, AppState>, id: Option<String>) -> AppResult<()> {
    match id {
        Some(id) => {
            sqlx::query(
                "INSERT INTO app_settings (key, value) VALUES ('active_tab_id', ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            )
            .bind(&id)
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM app_settings WHERE key = 'active_tab_id'")
                .execute(&state.db)
                .await?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_active_tab_id(state: State<'_, AppState>) -> AppResult<Option<String>> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_settings WHERE key = 'active_tab_id'")
            .fetch_optional(&state.db)
            .await?;
    Ok(row.map(|(v,)| v))
}
