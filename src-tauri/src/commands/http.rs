use crate::error::{AppError, AppResult};
use crate::models::{serialize_kv_list, HistoryRequest, KeyValueEntry, SendHttpRequestInput};
use crate::state::AppState;
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use std::str::FromStr;
use std::time::Instant;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn send_http_request(
    state: State<'_, AppState>,
    input: SendHttpRequestInput,
) -> AppResult<HistoryRequest> {
    let sent_at = Utc::now().to_rfc3339();
    let started = Instant::now();

    let method = Method::from_str(&input.method.to_uppercase())
        .map_err(|_| AppError::Other(format!("invalid HTTP method: {}", input.method)))?;

    let mut header_map = HeaderMap::new();
    for entry in input.headers.iter().filter(|h| h.enabled) {
        if entry.key.trim().is_empty() {
            continue;
        }
        let name = HeaderName::from_bytes(entry.key.as_bytes())
            .map_err(|_| AppError::Other(format!("invalid header name: {}", entry.key)))?;
        let value = HeaderValue::from_str(&entry.value)
            .map_err(|_| AppError::Other(format!("invalid header value for {}", entry.key)))?;
        header_map.insert(name, value);
    }

    let client_builder = reqwest::Client::builder()
        .danger_accept_invalid_certs(input.danger_accept_invalid_certs)
        .redirect(if input.follow_redirects {
            reqwest::redirect::Policy::limited(10)
        } else {
            reqwest::redirect::Policy::none()
        });
    let client_builder = if let Some(timeout_ms) = input.timeout_ms {
        client_builder.timeout(std::time::Duration::from_millis(timeout_ms))
    } else {
        client_builder
    };
    let client = client_builder
        .build()
        .map_err(|e| AppError::Other(format!("failed to build http client: {e}")))?;

    let mut request = client.request(method.clone(), &input.url).headers(header_map);
    if let Some(body) = &input.body {
        if !matches!(input.body_type.as_deref(), Some("none")) {
            request = request.body(body.clone());
        }
    }

    let id = Uuid::new_v4().to_string();
    let request_headers_json = serialize_kv_list(&input.headers);

    let result = request.send().await;

    let history = match result {
        Ok(response) => {
            let status_code = response.status().as_u16() as i64;
            let status_text = response
                .status()
                .canonical_reason()
                .unwrap_or("")
                .to_string();
            let response_headers: Vec<KeyValueEntry> = response
                .headers()
                .iter()
                .map(|(k, v)| KeyValueEntry {
                    key: k.to_string(),
                    value: v.to_str().unwrap_or("").to_string(),
                    enabled: true,
                })
                .collect();
            let bytes = response.bytes().await.unwrap_or_default();
            let size = bytes.len() as i64;
            let (body_text, encoding) = match std::str::from_utf8(&bytes) {
                Ok(text) => (text.to_string(), "text"),
                Err(_) => (
                    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes),
                    "base64",
                ),
            };
            let duration_ms = started.elapsed().as_millis() as i64;

            HistoryRequest {
                id: id.clone(),
                saved_request_id: input.saved_request_id.clone(),
                environment_id: input.environment_id_for_log.clone(),
                method: method.to_string(),
                url: input.url.clone(),
                request_headers: input.headers.clone(),
                request_body: input.body.clone(),
                status_code: Some(status_code),
                status_text: Some(status_text),
                response_headers,
                response_body: Some(body_text),
                response_body_encoding: encoding.to_string(),
                response_size_bytes: Some(size),
                duration_ms: Some(duration_ms),
                error_message: None,
                sent_at: sent_at.clone(),
            }
        }
        Err(e) => {
            let duration_ms = started.elapsed().as_millis() as i64;
            HistoryRequest {
                id: id.clone(),
                saved_request_id: input.saved_request_id.clone(),
                environment_id: input.environment_id_for_log.clone(),
                method: method.to_string(),
                url: input.url.clone(),
                request_headers: input.headers.clone(),
                request_body: input.body.clone(),
                status_code: None,
                status_text: None,
                response_headers: vec![],
                response_body: None,
                response_body_encoding: "text".to_string(),
                response_size_bytes: None,
                duration_ms: Some(duration_ms),
                error_message: Some(e.to_string()),
                sent_at: sent_at.clone(),
            }
        }
    };

    sqlx::query(
        "INSERT INTO history_requests (id, saved_request_id, environment_id, method, url, request_headers, request_body, status_code, status_text, response_headers, response_body, response_body_encoding, response_size_bytes, duration_ms, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&history.id)
    .bind(&history.saved_request_id)
    .bind(&history.environment_id)
    .bind(&history.method)
    .bind(&history.url)
    .bind(&request_headers_json)
    .bind(&history.request_body)
    .bind(history.status_code)
    .bind(&history.status_text)
    .bind(serialize_kv_list(&history.response_headers))
    .bind(&history.response_body)
    .bind(&history.response_body_encoding)
    .bind(history.response_size_bytes)
    .bind(history.duration_ms)
    .bind(&history.error_message)
    .bind(&history.sent_at)
    .execute(&state.db)
    .await?;

    Ok(history)
}
