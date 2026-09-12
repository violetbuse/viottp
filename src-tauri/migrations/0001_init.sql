CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE environments (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- environment_id NULL = global scope. Uniqueness of (environment_id, key)
-- for NULL rows is enforced in application code, since SQLite treats
-- each NULL as distinct for UNIQUE constraints.
CREATE TABLE variables (
    id             TEXT PRIMARY KEY,
    environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE,
    key            TEXT NOT NULL,
    value          TEXT NOT NULL,
    is_secret      INTEGER NOT NULL DEFAULT 0,
    enabled        INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);
CREATE INDEX idx_variables_env ON variables(environment_id);

-- Flat list, shared by HTTP and WS "saved" items (no folders).
CREATE TABLE saved_requests (
    id              TEXT PRIMARY KEY,
    kind            TEXT NOT NULL CHECK (kind IN ('http','ws')),
    name            TEXT NOT NULL,
    method          TEXT,
    url             TEXT NOT NULL,
    headers         TEXT NOT NULL DEFAULT '[]',
    query_params    TEXT NOT NULL DEFAULT '[]',
    body            TEXT,
    body_type       TEXT CHECK (body_type IN ('none','json','text','form','multipart')),
    ws_init_message TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX idx_saved_requests_sort ON saved_requests(kind, sort_order);

CREATE TABLE history_requests (
    id                     TEXT PRIMARY KEY,
    saved_request_id       TEXT REFERENCES saved_requests(id) ON DELETE SET NULL,
    environment_id         TEXT,
    method                 TEXT NOT NULL,
    url                    TEXT NOT NULL,
    request_headers        TEXT NOT NULL DEFAULT '[]',
    request_body           TEXT,
    status_code            INTEGER,
    status_text            TEXT,
    response_headers       TEXT,
    response_body          TEXT,
    response_body_encoding TEXT NOT NULL DEFAULT 'text' CHECK (response_body_encoding IN ('text','base64')),
    response_size_bytes    INTEGER,
    duration_ms            INTEGER,
    error_message          TEXT,
    sent_at                TEXT NOT NULL
);
CREATE INDEX idx_history_requests_sent_at ON history_requests(sent_at DESC);

CREATE TABLE history_ws_sessions (
    id               TEXT PRIMARY KEY,
    saved_request_id TEXT REFERENCES saved_requests(id) ON DELETE SET NULL,
    environment_id   TEXT,
    url              TEXT NOT NULL,
    request_headers  TEXT NOT NULL DEFAULT '[]',
    connected_at     TEXT NOT NULL,
    disconnected_at  TEXT,
    close_code       INTEGER,
    close_reason     TEXT,
    error_message    TEXT
);
CREATE INDEX idx_ws_sessions_connected_at ON history_ws_sessions(connected_at DESC);

CREATE TABLE history_ws_messages (
    id               TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL REFERENCES history_ws_sessions(id) ON DELETE CASCADE,
    direction        TEXT NOT NULL CHECK (direction IN ('sent','received')),
    message_type     TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','binary','ping','pong','close')),
    payload          TEXT NOT NULL,
    payload_encoding TEXT NOT NULL DEFAULT 'text' CHECK (payload_encoding IN ('text','base64')),
    size_bytes       INTEGER NOT NULL DEFAULT 0,
    occurred_at      TEXT NOT NULL
);
CREATE INDEX idx_ws_messages_session ON history_ws_messages(session_id, occurred_at);
