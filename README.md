# viottp

A lightweight desktop HTTP and WebSocket client, built with [Tauri](https://tauri.app) 2, React 19, and TypeScript.

## Features

- **HTTP requests** — send requests with custom methods, headers, query params, and bodies (JSON, text, form, multipart), with full request/response history.
- **WebSocket client** — connect, send text/binary messages, and watch the live message log; every session is recorded with its messages.
- **Saved requests** — save HTTP and WebSocket requests to a flat, reorderable list for reuse.
- **Environments & variables** — define global and per-environment key-value variables and reference them anywhere with `{{variable}}` syntax.
- **History** — browse, inspect, search, and clear past HTTP requests and WebSocket sessions.
- **Import/export** — back up or share environments, variables, and saved requests as JSON.

All data (saved requests, environments, variables, history) is stored locally in a SQLite database in the app's data directory — nothing leaves your machine.

## Tech stack

- **Backend:** Rust, [Tauri 2](https://tauri.app), [sqlx](https://github.com/launchbadge/sqlx) (SQLite), [reqwest](https://github.com/seanmonstar/reqwest) (HTTP), [tokio-tungstenite](https://github.com/snapview/tokio-tungstenite) (WebSocket)
- **Frontend:** React 19, TypeScript, [Zustand](https://github.com/pmndrs/zustand) (state), Tailwind CSS v4, [CodeMirror](https://codemirror.net/) (editors), [Radix UI](https://www.radix-ui.com/) (primitives)
- **Build tooling:** Vite

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+) and npm
- [Rust](https://www.rust-lang.org/tools/install) and Cargo
- Platform dependencies for Tauri — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for your OS

## Getting started

Install dependencies:

```sh
npm install
```

Run the app in development mode (starts the Vite dev server and opens the native window):

```sh
npm run tauri dev
```

## Building

Type-check and build the frontend only:

```sh
npm run build
```

Build the full native app bundle for your platform:

```sh
npm run tauri build
```

## Project structure

```
src/                  Frontend (React + TypeScript)
  components/         Shared UI components
  features/           UI grouped by domain (request builder, response panel, sidebar, history, import/export)
  stores/             Zustand stores (one per domain)
  lib/                Types, Tauri command wrappers, variable interpolation

src-tauri/            Backend (Rust)
  src/commands/       Tauri commands, one module per domain
  src/models.rs       Shared data models
  migrations/         SQLite schema migrations
```

See [CLAUDE.md](./CLAUDE.md) for a deeper look at the architecture.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
