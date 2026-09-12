use crate::error::AppResult;
use crate::models::{serialize_kv_list, Environment, SavedRequest, Variable};
use crate::state::AppState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ExportBundle {
    pub environments: Vec<Environment>,
    pub variables: Vec<Variable>,
    pub saved_requests: Vec<SavedRequest>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImportMode {
    Merge,
    Replace,
}

#[derive(Debug, Serialize)]
pub struct ImportSummary {
    pub environments_imported: i64,
    pub variables_imported: i64,
    pub saved_requests_imported: i64,
}

#[tauri::command]
pub async fn export_data(state: State<'_, AppState>, path: String) -> AppResult<()> {
    let environments = sqlx::query_as::<_, Environment>(
        "SELECT id, name, sort_order, created_at, updated_at FROM environments ORDER BY sort_order ASC",
    )
    .fetch_all(&state.db)
    .await?;

    let variables = sqlx::query_as::<_, Variable>(
        "SELECT id, environment_id, key, value, is_secret, enabled, created_at, updated_at FROM variables",
    )
    .fetch_all(&state.db)
    .await?;

    let saved_rows = sqlx::query_as::<_, crate::models::SavedRequestRow>(
        "SELECT id, kind, name, method, url, headers, query_params, body, body_type, ws_init_message, sort_order, created_at, updated_at FROM saved_requests ORDER BY sort_order ASC",
    )
    .fetch_all(&state.db)
    .await?;
    let saved_requests = saved_rows.into_iter().map(SavedRequest::from).collect();

    let bundle = ExportBundle {
        environments,
        variables,
        saved_requests,
    };

    let json = serde_json::to_string_pretty(&bundle)?;
    std::fs::write(&path, json)?;
    Ok(())
}

#[tauri::command]
pub async fn import_data(
    state: State<'_, AppState>,
    path: String,
    mode: ImportMode,
) -> AppResult<ImportSummary> {
    let contents = std::fs::read_to_string(&path)?;
    let bundle: ExportBundle = serde_json::from_str(&contents)?;

    if mode == ImportMode::Replace {
        sqlx::query("DELETE FROM saved_requests")
            .execute(&state.db)
            .await?;
        sqlx::query("DELETE FROM variables").execute(&state.db).await?;
        sqlx::query("DELETE FROM environments")
            .execute(&state.db)
            .await?;
    }

    let now = Utc::now().to_rfc3339();
    let mut env_id_map = std::collections::HashMap::new();

    for env in &bundle.environments {
        let new_id = if mode == ImportMode::Replace {
            env.id.clone()
        } else {
            Uuid::new_v4().to_string()
        };
        env_id_map.insert(env.id.clone(), new_id.clone());
        sqlx::query(
            "INSERT INTO environments (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&env.name)
        .bind(env.sort_order)
        .bind(&now)
        .bind(&now)
        .execute(&state.db)
        .await?;
    }

    for var in &bundle.variables {
        let new_id = Uuid::new_v4().to_string();
        let env_id = var
            .environment_id
            .as_ref()
            .and_then(|id| env_id_map.get(id).cloned());
        sqlx::query(
            "INSERT INTO variables (id, environment_id, key, value, is_secret, enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&env_id)
        .bind(&var.key)
        .bind(&var.value)
        .bind(var.is_secret)
        .bind(var.enabled)
        .bind(&now)
        .bind(&now)
        .execute(&state.db)
        .await?;
    }

    for req in &bundle.saved_requests {
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO saved_requests (id, kind, name, method, url, headers, query_params, body, body_type, ws_init_message, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(req.kind.as_str())
        .bind(&req.name)
        .bind(&req.method)
        .bind(&req.url)
        .bind(serialize_kv_list(&req.headers))
        .bind(serialize_kv_list(&req.query_params))
        .bind(&req.body)
        .bind(&req.body_type)
        .bind(&req.ws_init_message)
        .bind(req.sort_order)
        .bind(&now)
        .bind(&now)
        .execute(&state.db)
        .await?;
    }

    Ok(ImportSummary {
        environments_imported: bundle.environments.len() as i64,
        variables_imported: bundle.variables.len() as i64,
        saved_requests_imported: bundle.saved_requests.len() as i64,
    })
}
