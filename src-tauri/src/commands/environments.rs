use crate::error::AppResult;
use crate::models::Environment;
use crate::state::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn list_environments(state: State<'_, AppState>) -> AppResult<Vec<Environment>> {
    let rows = sqlx::query_as::<_, Environment>(
        "SELECT id, name, sort_order, created_at, updated_at FROM environments ORDER BY sort_order ASC, created_at ASC",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn create_environment(state: State<'_, AppState>, name: String) -> AppResult<Environment> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO environments (id, name, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await?;

    Ok(Environment {
        id,
        name,
        sort_order: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn rename_environment(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> AppResult<()> {
    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE environments SET name = ?, updated_at = ? WHERE id = ?")
        .bind(&name)
        .bind(&now)
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_environment(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM environments WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;

    let active = get_active_environment_id(&state).await?;
    if active.as_deref() == Some(id.as_str()) {
        sqlx::query("DELETE FROM app_settings WHERE key = 'active_environment_id'")
            .execute(&state.db)
            .await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn set_active_environment(
    state: State<'_, AppState>,
    id: Option<String>,
) -> AppResult<()> {
    match id {
        Some(id) => {
            sqlx::query(
                "INSERT INTO app_settings (key, value) VALUES ('active_environment_id', ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            )
            .bind(&id)
            .execute(&state.db)
            .await?;
        }
        None => {
            sqlx::query("DELETE FROM app_settings WHERE key = 'active_environment_id'")
                .execute(&state.db)
                .await?;
        }
    }
    Ok(())
}

async fn get_active_environment_id(state: &State<'_, AppState>) -> AppResult<Option<String>> {
    let row: Option<(String,)> =
        sqlx::query_as("SELECT value FROM app_settings WHERE key = 'active_environment_id'")
            .fetch_optional(&state.db)
            .await?;
    Ok(row.map(|(v,)| v))
}

#[tauri::command]
pub async fn get_active_environment(
    state: State<'_, AppState>,
) -> AppResult<Option<Environment>> {
    let Some(id) = get_active_environment_id(&state).await? else {
        return Ok(None);
    };
    let row = sqlx::query_as::<_, Environment>(
        "SELECT id, name, sort_order, created_at, updated_at FROM environments WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await?;
    Ok(row)
}
