use crate::error::{AppError, AppResult};
use crate::models::{
    parse_kv_list, serialize_kv_list, WsConnectInput, WsMessage, WsMessageType, WsSession,
};
use crate::state::AppState;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chrono::Utc;
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::handshake::client::generate_key;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};
use uuid::Uuid;

type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub enum WsOutboundCommand {
    Send(Message),
    Close(Option<u16>, Option<String>),
}

pub struct WsHandle {
    pub sender: mpsc::UnboundedSender<WsOutboundCommand>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WsConnectResult {
    pub connection_id: String,
    pub session: WsSession,
}

#[derive(Clone, Serialize)]
#[serde(tag = "kind")]
pub enum WsFrontendEvent {
    #[serde(rename = "message")]
    Message {
        connection_id: String,
        message: WsMessage,
    },
    #[serde(rename = "closed")]
    Closed {
        connection_id: String,
        code: Option<u16>,
        reason: Option<String>,
    },
    #[serde(rename = "error")]
    Error {
        connection_id: String,
        message: String,
    },
}

#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    input: WsConnectInput,
) -> AppResult<WsConnectResult> {
    let connection_id = Uuid::new_v4().to_string();
    let session_id = Uuid::new_v4().to_string();
    let connected_at = Utc::now().to_rfc3339();

    let mut request = input
        .url
        .clone()
        .into_client_request()
        .map_err(|e| AppError::InvalidUrl(e.to_string()))?;
    for entry in input.headers.iter().filter(|h| h.enabled) {
        if entry.key.trim().is_empty() {
            continue;
        }
        let name = tokio_tungstenite::tungstenite::http::HeaderName::from_bytes(
            entry.key.as_bytes(),
        )
        .map_err(|_| AppError::Other(format!("invalid header name: {}", entry.key)))?;
        let value = HeaderValue::from_str(&entry.value)
            .map_err(|_| AppError::Other(format!("invalid header value for {}", entry.key)))?;
        request.headers_mut().insert(name, value);
    }
    // Ensure Sec-WebSocket-Key is present/valid even if custom headers were added.
    if !request.headers().contains_key("sec-websocket-key") {
        request.headers_mut().insert(
            "sec-websocket-key",
            HeaderValue::from_str(&generate_key()).unwrap(),
        );
    }

    let (ws_stream, _) = connect_async(request).await?;

    let headers_json = serialize_kv_list(&input.headers);
    sqlx::query(
        "INSERT INTO history_ws_sessions (id, saved_request_id, environment_id, url, request_headers, connected_at)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&session_id)
    .bind(&input.saved_request_id)
    .bind(&input.environment_id_for_log)
    .bind(&input.url)
    .bind(&headers_json)
    .bind(&connected_at)
    .execute(&state.db)
    .await?;

    let (write, read) = ws_stream.split();
    let (tx, rx) = mpsc::unbounded_channel::<WsOutboundCommand>();

    state
        .ws_connections
        .lock()
        .await
        .insert(connection_id.clone(), WsHandle { sender: tx });

    let db = state.db.clone();
    let app_handle = app.clone();
    let session_id_task = session_id.clone();
    let connection_id_task = connection_id.clone();

    tauri::async_runtime::spawn(async move {
        run_ws_loop(
            app_handle,
            db,
            session_id_task,
            connection_id_task,
            write,
            read,
            rx,
        )
        .await;
    });

    Ok(WsConnectResult {
        connection_id,
        session: WsSession {
            id: session_id,
            saved_request_id: input.saved_request_id,
            environment_id: input.environment_id_for_log,
            url: input.url,
            request_headers: parse_kv_list(&headers_json),
            connected_at,
            disconnected_at: None,
            close_code: None,
            close_reason: None,
            error_message: None,
        },
    })
}

#[tauri::command]
pub async fn ws_send(
    state: State<'_, AppState>,
    connection_id: String,
    payload: String,
    message_type: WsMessageType,
) -> AppResult<()> {
    let handles = state.ws_connections.lock().await;
    let handle = handles.get(&connection_id).ok_or(AppError::NotFound)?;
    let msg = match message_type {
        WsMessageType::Text => Message::Text(payload.into()),
        WsMessageType::Binary => {
            let bytes = BASE64
                .decode(payload.as_bytes())
                .map_err(|e| AppError::Other(format!("invalid base64 payload: {e}")))?;
            Message::Binary(bytes.into())
        }
    };
    handle
        .sender
        .send(WsOutboundCommand::Send(msg))
        .map_err(|_| AppError::Other("connection is closed".to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn ws_disconnect(
    state: State<'_, AppState>,
    connection_id: String,
    code: Option<u16>,
    reason: Option<String>,
) -> AppResult<()> {
    let handles = state.ws_connections.lock().await;
    if let Some(handle) = handles.get(&connection_id) {
        let _ = handle.sender.send(WsOutboundCommand::Close(code, reason));
    }
    Ok(())
}

async fn run_ws_loop(
    app: AppHandle,
    db: SqlitePool,
    session_id: String,
    connection_id: String,
    mut write: SplitSink<WsStream, Message>,
    mut read: SplitStream<WsStream>,
    mut rx: mpsc::UnboundedReceiver<WsOutboundCommand>,
) {
    let (final_code, final_reason, final_error): (Option<u16>, Option<String>, Option<String>) = loop {
        tokio::select! {
            outbound = rx.recv() => {
                match outbound {
                    Some(WsOutboundCommand::Send(msg)) => {
                        if let Some(persisted) = persist_message(&db, &session_id, "sent", &msg).await {
                            let _ = app.emit("ws:event", WsFrontendEvent::Message {
                                connection_id: connection_id.clone(),
                                message: persisted,
                            });
                        }
                        if write.send(msg).await.is_err() {
                            break (None, None, Some("failed to send message".to_string()));
                        }
                    }
                    Some(WsOutboundCommand::Close(code, reason)) => {
                        let close_frame = code.map(|c| tokio_tungstenite::tungstenite::protocol::CloseFrame {
                            code: c.into(),
                            reason: reason.clone().unwrap_or_default().into(),
                        });
                        let _ = write.send(Message::Close(close_frame)).await;
                        break (code, reason, None);
                    }
                    None => break (None, None, None),
                }
            }
            incoming = read.next() => {
                match incoming {
                    Some(Ok(Message::Close(frame))) => {
                        let (code, reason) = match frame {
                            Some(f) => (Some(f.code.into()), Some(f.reason.to_string())),
                            None => (None, None),
                        };
                        break (code, reason, None);
                    }
                    Some(Ok(msg)) => {
                        if let Some(persisted) = persist_message(&db, &session_id, "received", &msg).await {
                            let _ = app.emit("ws:event", WsFrontendEvent::Message {
                                connection_id: connection_id.clone(),
                                message: persisted,
                            });
                        }
                    }
                    Some(Err(e)) => {
                        break (None, None, Some(e.to_string()));
                    }
                    None => break (None, None, None),
                }
            }
        }
    };

    let disconnected_at = Utc::now().to_rfc3339();
    let _ = sqlx::query(
        "UPDATE history_ws_sessions SET disconnected_at = ?, close_code = ?, close_reason = ?, error_message = ? WHERE id = ?",
    )
    .bind(&disconnected_at)
    .bind(final_code.map(|c| c as i64))
    .bind(&final_reason)
    .bind(&final_error)
    .bind(&session_id)
    .execute(&db)
    .await;

    if let Some(err) = &final_error {
        let _ = app.emit(
            "ws:event",
            WsFrontendEvent::Error {
                connection_id: connection_id.clone(),
                message: err.clone(),
            },
        );
    } else {
        let _ = app.emit(
            "ws:event",
            WsFrontendEvent::Closed {
                connection_id: connection_id.clone(),
                code: final_code,
                reason: final_reason,
            },
        );
    }

    app.state::<AppState>()
        .ws_connections
        .lock()
        .await
        .remove(&connection_id);
}

async fn persist_message(
    db: &SqlitePool,
    session_id: &str,
    direction: &str,
    msg: &Message,
) -> Option<WsMessage> {
    let id = Uuid::new_v4().to_string();
    let occurred_at = Utc::now().to_rfc3339();

    let (message_type, payload, payload_encoding, size_bytes): (&str, String, &str, i64) = match msg
    {
        Message::Text(t) => ("text", t.to_string(), "text", t.len() as i64),
        Message::Binary(b) => (
            "binary",
            BASE64.encode(b.as_ref() as &[u8]),
            "base64",
            b.len() as i64,
        ),
        Message::Ping(b) => (
            "ping",
            BASE64.encode(b.as_ref() as &[u8]),
            "base64",
            b.len() as i64,
        ),
        Message::Pong(b) => (
            "pong",
            BASE64.encode(b.as_ref() as &[u8]),
            "base64",
            b.len() as i64,
        ),
        Message::Close(_) => ("close", String::new(), "text", 0),
        Message::Frame(_) => return None,
    };

    let result = sqlx::query(
        "INSERT INTO history_ws_messages (id, session_id, direction, message_type, payload, payload_encoding, size_bytes, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(session_id)
    .bind(direction)
    .bind(message_type)
    .bind(&payload)
    .bind(payload_encoding)
    .bind(size_bytes)
    .bind(&occurred_at)
    .execute(db)
    .await;

    if result.is_err() {
        return None;
    }

    Some(WsMessage {
        id,
        session_id: session_id.to_string(),
        direction: direction.to_string(),
        message_type: message_type.to_string(),
        payload,
        payload_encoding: payload_encoding.to_string(),
        size_bytes,
        occurred_at,
    })
}
