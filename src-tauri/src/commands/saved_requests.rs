use crate::error::{AppError, AppResult};
use crate::models::{serialize_kv_list, SavedRequest, SavedRequestInput, SavedRequestRow};
use crate::state::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

const SELECT_COLUMNS: &str = "id, kind, name, method, url, headers, query_params, body, body_type, ws_init_message, sort_order, created_at, updated_at";

#[tauri::command]
pub async fn list_saved_requests(state: State<'_, AppState>) -> AppResult<Vec<SavedRequest>> {
    let rows = sqlx::query_as::<_, SavedRequestRow>(&format!(
        "SELECT {SELECT_COLUMNS} FROM saved_requests ORDER BY sort_order ASC, created_at ASC"
    ))
    .fetch_all(&state.db)
    .await?;
    Ok(rows.into_iter().map(SavedRequest::from).collect())
}

#[tauri::command]
pub async fn get_saved_request(state: State<'_, AppState>, id: String) -> AppResult<SavedRequest> {
    let row = sqlx::query_as::<_, SavedRequestRow>(&format!(
        "SELECT {SELECT_COLUMNS} FROM saved_requests WHERE id = ?"
    ))
    .bind(&id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;
    Ok(row.into())
}

#[tauri::command]
pub async fn create_saved_request(
    state: State<'_, AppState>,
    input: SavedRequestInput,
) -> AppResult<SavedRequest> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let headers = serialize_kv_list(&input.headers);
    let query_params = serialize_kv_list(&input.query_params);

    sqlx::query(
        "INSERT INTO saved_requests (id, kind, name, method, url, headers, query_params, body, body_type, ws_init_message, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(input.kind.as_str())
    .bind(&input.name)
    .bind(&input.method)
    .bind(&input.url)
    .bind(&headers)
    .bind(&query_params)
    .bind(&input.body)
    .bind(&input.body_type)
    .bind(&input.ws_init_message)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await?;

    get_saved_request(state, id).await
}

#[tauri::command]
pub async fn update_saved_request(
    state: State<'_, AppState>,
    id: String,
    input: SavedRequestInput,
) -> AppResult<SavedRequest> {
    let now = Utc::now().to_rfc3339();
    let headers = serialize_kv_list(&input.headers);
    let query_params = serialize_kv_list(&input.query_params);

    sqlx::query(
        "UPDATE saved_requests SET kind = ?, name = ?, method = ?, url = ?, headers = ?, query_params = ?, body = ?, body_type = ?, ws_init_message = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(input.kind.as_str())
    .bind(&input.name)
    .bind(&input.method)
    .bind(&input.url)
    .bind(&headers)
    .bind(&query_params)
    .bind(&input.body)
    .bind(&input.body_type)
    .bind(&input.ws_init_message)
    .bind(&now)
    .bind(&id)
    .execute(&state.db)
    .await?;

    get_saved_request(state, id).await
}

#[tauri::command]
pub async fn delete_saved_request(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM saved_requests WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_saved_requests(
    state: State<'_, AppState>,
    ordered_ids: Vec<String>,
) -> AppResult<()> {
    let mut tx = state.db.begin().await?;
    for (index, id) in ordered_ids.iter().enumerate() {
        sqlx::query("UPDATE saved_requests SET sort_order = ? WHERE id = ?")
            .bind(index as i64)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}
