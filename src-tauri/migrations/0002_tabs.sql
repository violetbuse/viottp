CREATE TABLE tabs (
    id                     TEXT PRIMARY KEY,
    kind                   TEXT NOT NULL CHECK (kind IN ('http','ws')),
    saved_request_id       TEXT REFERENCES saved_requests(id) ON DELETE SET NULL,
    sort_order             INTEGER NOT NULL DEFAULT 0,
    name                   TEXT NOT NULL,
    method                 TEXT NOT NULL DEFAULT 'GET',
    url                    TEXT NOT NULL DEFAULT '',
    headers                TEXT NOT NULL DEFAULT '[]',
    query_params           TEXT NOT NULL DEFAULT '[]',
    body                   TEXT,
    body_type              TEXT CHECK (body_type IN ('none','json','text','form','multipart')),
    ws_init_message        TEXT,
    status_code            INTEGER,
    status_text            TEXT,
    response_headers       TEXT,
    response_body          TEXT,
    response_body_encoding TEXT NOT NULL DEFAULT 'text' CHECK (response_body_encoding IN ('text','base64')),
    response_size_bytes    INTEGER,
    duration_ms            INTEGER,
    error_message          TEXT,
    created_at             TEXT NOT NULL,
    updated_at             TEXT NOT NULL
);

CREATE INDEX idx_tabs_sort ON tabs(sort_order);
