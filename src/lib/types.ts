export interface KeyValueEntry {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Variable {
  id: string;
  environment_id: string | null;
  key: string;
  value: string;
  is_secret: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertVariableInput {
  id?: string | null;
  environment_id: string | null;
  key: string;
  value: string;
  is_secret: boolean;
  enabled: boolean;
}

export type SavedRequestKind = "http" | "ws";
export type BodyType = "none" | "json" | "text" | "form" | "multipart";

export interface SavedRequest {
  id: string;
  kind: SavedRequestKind;
  name: string;
  method: string | null;
  url: string;
  headers: KeyValueEntry[];
  query_params: KeyValueEntry[];
  body: string | null;
  body_type: BodyType | null;
  ws_init_message: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavedRequestInput {
  kind: SavedRequestKind;
  name: string;
  method: string | null;
  url: string;
  headers: KeyValueEntry[];
  query_params: KeyValueEntry[];
  body: string | null;
  body_type: BodyType | null;
  ws_init_message: string | null;
}

export interface Tab {
  id: string;
  kind: SavedRequestKind;
  saved_request_id: string | null;
  sort_order: number;
  name: string;
  method: string;
  url: string;
  headers: KeyValueEntry[];
  query_params: KeyValueEntry[];
  body: string | null;
  body_type: BodyType | null;
  ws_init_message: string | null;
  status_code: number | null;
  status_text: string | null;
  response_headers: KeyValueEntry[];
  response_body: string | null;
  response_body_encoding: "text" | "base64";
  response_size_bytes: number | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertTabInput {
  id: string;
  kind: SavedRequestKind;
  saved_request_id: string | null;
  sort_order: number;
  name: string;
  method: string;
  url: string;
  headers: KeyValueEntry[];
  query_params: KeyValueEntry[];
  body: string | null;
  body_type: BodyType | null;
  ws_init_message: string | null;
  status_code: number | null;
  status_text: string | null;
  response_headers: KeyValueEntry[];
  response_body: string | null;
  response_body_encoding: "text" | "base64";
  response_size_bytes: number | null;
  duration_ms: number | null;
  error_message: string | null;
}

export interface HistoryRequest {
  id: string;
  saved_request_id: string | null;
  environment_id: string | null;
  method: string;
  url: string;
  request_headers: KeyValueEntry[];
  request_body: string | null;
  status_code: number | null;
  status_text: string | null;
  response_headers: KeyValueEntry[];
  response_body: string | null;
  response_body_encoding: "text" | "base64";
  response_size_bytes: number | null;
  duration_ms: number | null;
  error_message: string | null;
  sent_at: string;
}

export interface HistoryRequestSummary {
  id: string;
  saved_request_id: string | null;
  method: string;
  url: string;
  status_code: number | null;
  duration_ms: number | null;
  response_size_bytes: number | null;
  error_message: string | null;
  sent_at: string;
}

export interface SendHttpRequestInput {
  method: string;
  url: string;
  headers: KeyValueEntry[];
  body: string | null;
  body_type: BodyType | null;
  timeout_ms: number | null;
  danger_accept_invalid_certs: boolean;
  follow_redirects: boolean;
  saved_request_id: string | null;
  environment_id_for_log: string | null;
}

export interface WsSession {
  id: string;
  saved_request_id: string | null;
  environment_id: string | null;
  url: string;
  request_headers: KeyValueEntry[];
  connected_at: string;
  disconnected_at: string | null;
  close_code: number | null;
  close_reason: string | null;
  error_message: string | null;
}

export interface WsSessionSummary extends WsSession {
  message_count: number;
}

export interface WsMessage {
  id: string;
  session_id: string;
  direction: "sent" | "received";
  message_type: "text" | "binary" | "ping" | "pong" | "close";
  payload: string;
  payload_encoding: "text" | "base64";
  size_bytes: number;
  occurred_at: string;
}

export interface WsSessionDetail {
  session: WsSession;
  messages: WsMessage[];
}

export interface WsConnectInput {
  url: string;
  headers: KeyValueEntry[];
  saved_request_id: string | null;
  environment_id_for_log: string | null;
}

export interface WsConnectResult {
  connection_id: string;
  session: WsSession;
}

export type WsMessageTypeInput = "text" | "binary";

export type WsFrontendEvent =
  | { kind: "message"; connection_id: string; message: WsMessage }
  | { kind: "closed"; connection_id: string; code: number | null; reason: string | null }
  | { kind: "error"; connection_id: string; message: string };

export type ImportMode = "merge" | "replace";

export interface ImportSummary {
  environments_imported: number;
  variables_imported: number;
  saved_requests_imported: number;
}

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
