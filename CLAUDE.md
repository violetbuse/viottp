# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

viottp (`com.violet.viottp`) is a desktop HTTP/WebSocket client, similar in spirit to Postman/Insomnia, built with Tauri 2 (Rust backend) + React 19 + TypeScript (frontend).

## Commands

- `npm run dev` — Vite dev server only (frontend, port 1420, fixed/strict)
- `npm run tauri dev` — full app in dev mode (spawns the Vite dev server via `beforeDevCommand`, opens the native window)
- `npm run build` — type-checks (`tsc`) then builds the frontend (`vite build`)
- `npm run tauri build` — production build/bundle of the whole app
- `cd src-tauri && cargo check` / `cargo build` — build the Rust backend directly
- `cd src-tauri && cargo test` — no tests currently exist in `src-tauri`; there is also no JS test runner configured. Don't assume a test command exists — verify before relying on one.

There is no lint script configured (no ESLint config present); rely on `tsc` (via `npm run build`) for type errors and `cargo check`/`cargo clippy` for Rust.

## Architecture

### Split: Tauri commands vs. frontend stores

The Rust backend (`src-tauri/src`) owns all persistence and I/O: SQLite (via `sqlx`), outbound HTTP (via `reqwest`), and WebSocket connections (via `tokio-tungstenite`). The frontend never talks to the network or disk directly — every capability is exposed as a `#[tauri::command]` in `src-tauri/src/commands/*.rs`, registered in the `invoke_handler!` list in `src-tauri/src/lib.rs`, and called from the frontend through the thin wrapper functions in `src/lib/tauri-api.ts` (one `invoke<...>(...)` per command). When adding a new backend capability: write the command function, add it to both the `mod.rs` re-export and the `generate_handler!` list in `lib.rs`, then add a matching wrapper in `tauri-api.ts` and types in `src/lib/types.ts`.

Command modules (`src-tauri/src/commands/`):
- `environments.rs` / `variables.rs` — environments and scoped/global key-value variables
- `saved_requests.rs` — flat (non-foldered) list of saved HTTP/WS requests, shared table keyed by `kind`
- `http.rs` — one-shot HTTP request execution, always logged to history
- `ws.rs` — WebSocket lifecycle (see below)
- `history.rs` — read/delete/clear for both HTTP history and WS session history
- `import_export.rs` — JSON export/import of environments, variables, and saved requests (`merge` or `replace` mode)

### State and errors

- `AppState` (`state.rs`) holds the `sqlx::SqlitePool` and a `Mutex<HashMap<String, WsHandle>>` mapping live WS connection IDs to their outbound-command channel.
- `AppError` (`error.rs`) is the single error type for all commands (`AppResult<T> = Result<T, AppError>`), implementing `Serialize` by collapsing to `{ message: string }` — the frontend reads this shape in `errorMessage()` (`src/lib/tauri-api.ts`).
- The SQLite DB lives in the app's data dir as `viottp.sqlite` (WAL mode); schema/migrations are in `src-tauri/migrations/` and run automatically via `sqlx::migrate!` on startup (`db.rs`). Variable uniqueness for `(environment_id, key)` when `environment_id` is `NULL` (global scope) is enforced in application code, not the schema, since SQLite treats each `NULL` as distinct.

### WebSocket connection model

A WS connection is NOT request/response like `invoke` — it's long-lived and event-driven:
1. `ws_connect` opens the socket, persists a `history_ws_sessions` row, stores a `WsHandle` (an `mpsc::UnboundedSender<WsOutboundCommand>`) in `AppState.ws_connections`, and spawns `run_ws_loop` as a background task.
2. `run_ws_loop` `tokio::select!`s between outbound commands (from `ws_send`/`ws_disconnect`, which just push onto the channel) and inbound socket frames, persisting every message to `history_ws_messages` and emitting a `"ws:event"` Tauri event (`WsFrontendEvent::Message | Closed | Error`) after each one.
3. The frontend has exactly one listener for `"ws:event"`, registered once in `src/stores/tabs-store.ts` (guarded by a module-level `listenerStarted` flag), which routes events to the owning tab via a `connectionToTab` map.

When touching WS behavior, changes usually need to happen in both `ws.rs` (backend loop/persistence/event shape) and `tabs-store.ts` (event routing) together.

### Frontend structure

- `src/stores/` — Zustand stores, one per domain (`tabs-store`, `environments-store`, `variables-store`, `saved-requests-store`, `history-store`). `tabs-store.ts` is the largest: it owns open-tab state, request drafts vs. saved "baseline" (for dirty-checking via `draftsEqual`), and drives `sendHttp`/`connectWs`/`sendWsMessage`/`disconnectWs`.
- `src/features/` — UI grouped by domain (`request-builder`, `response-panel`, `sidebar`, `history`, `import-export`), consuming the stores above.
- `src/lib/interpolate.ts` — `{{variable}}` substitution used to resolve request URL/headers/body against the active environment's variables before sending; `findUnresolvedVariables*` surfaces variables referenced but not defined, for UI warnings.
- `src/lib/types.ts` — TypeScript types mirroring the Rust `models.rs` structs/serde shapes; keep both in sync when changing a command's input/output shape.
- Styling is Tailwind v4 (via `@tailwindcss/vite`, no separate `tailwind.config`), custom theme tokens (`bg-base`, `text-ink`, etc.) defined in `src/index.css`.

### Adding a saved-request or history field

Since `saved_requests`/`history_requests`/`history_ws_*` are shared flat tables (not per-kind), a new field touches: the migration SQL, the Rust struct in `models.rs`, the relevant command in `commands/`, the TS type in `types.ts`, and the wrapper in `tauri-api.ts`.

## Versioning

When making changes to the app, bump the version number (patch for fixes/small changes, minor for new features) in all three of these files together — they must stay in sync:
- `package.json` (`version`)
- `src-tauri/Cargo.toml` (`version`)
- `src-tauri/tauri.conf.json` (`version`)
