use crate::error::AppResult;
use crate::models::{UpsertVariableInput, Variable};
use crate::state::AppState;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn list_variables(
    state: State<'_, AppState>,
    environment_id: Option<String>,
) -> AppResult<Vec<Variable>> {
    let rows = match environment_id {
        Some(env_id) => {
            sqlx::query_as::<_, Variable>(
                "SELECT id, environment_id, key, value, is_secret, enabled, created_at, updated_at
                 FROM variables WHERE environment_id = ? ORDER BY key ASC",
            )
            .bind(env_id)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as::<_, Variable>(
                "SELECT id, environment_id, key, value, is_secret, enabled, created_at, updated_at
                 FROM variables WHERE environment_id IS NULL ORDER BY key ASC",
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(rows)
}

#[tauri::command]
pub async fn upsert_variable(
    state: State<'_, AppState>,
    input: UpsertVariableInput,
) -> AppResult<Variable> {
    let now = Utc::now().to_rfc3339();

    // Enforce uniqueness of (environment_id, key) in application code, since
    // SQLite treats NULL environment_id values as distinct for UNIQUE constraints.
    let existing: Option<(String,)> = match &input.environment_id {
        Some(env_id) => {
            sqlx::query_as(
                "SELECT id FROM variables WHERE environment_id = ? AND key = ? AND id != ?",
            )
            .bind(env_id)
            .bind(&input.key)
            .bind(input.id.clone().unwrap_or_default())
            .fetch_optional(&state.db)
            .await?
        }
        None => {
            sqlx::query_as(
                "SELECT id FROM variables WHERE environment_id IS NULL AND key = ? AND id != ?",
            )
            .bind(&input.key)
            .bind(input.id.clone().unwrap_or_default())
            .fetch_optional(&state.db)
            .await?
        }
    };
    if existing.is_some() {
        return Err(crate::error::AppError::Other(format!(
            "a variable named '{}' already exists in this scope",
            input.key
        )));
    }

    let id = input.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let is_update = input.id.is_some();

    if is_update {
        sqlx::query(
            "UPDATE variables SET environment_id = ?, key = ?, value = ?, is_secret = ?, enabled = ?, updated_at = ?
             WHERE id = ?",
        )
        .bind(&input.environment_id)
        .bind(&input.key)
        .bind(&input.value)
        .bind(input.is_secret)
        .bind(input.enabled)
        .bind(&now)
        .bind(&id)
        .execute(&state.db)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO variables (id, environment_id, key, value, is_secret, enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&input.environment_id)
        .bind(&input.key)
        .bind(&input.value)
        .bind(input.is_secret)
        .bind(input.enabled)
        .bind(&now)
        .bind(&now)
        .execute(&state.db)
        .await?;
    }

    let row = sqlx::query_as::<_, Variable>(
        "SELECT id, environment_id, key, value, is_secret, enabled, created_at, updated_at
         FROM variables WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&state.db)
    .await?;
    Ok(row)
}

#[tauri::command]
pub async fn delete_variable(state: State<'_, AppState>, id: String) -> AppResult<()> {
    sqlx::query("DELETE FROM variables WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await?;
    Ok(())
}
