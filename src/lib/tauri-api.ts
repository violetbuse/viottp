import { invoke } from "@tauri-apps/api/core";
import type {
  Environment,
  HistoryRequest,
  HistoryRequestSummary,
  ImportMode,
  ImportSummary,
  SavedRequest,
  SavedRequestInput,
  SendHttpRequestInput,
  Tab,
  UpsertTabInput,
  UpsertVariableInput,
  Variable,
  WsConnectInput,
  WsConnectResult,
  WsMessageTypeInput,
  WsSessionDetail,
  WsSessionSummary,
} from "./types";

export interface AppError {
  message: string;
}

// ---------- Environments ----------

export const listEnvironments = () => invoke<Environment[]>("list_environments");
export const createEnvironment = (name: string) =>
  invoke<Environment>("create_environment", { name });
export const renameEnvironment = (id: string, name: string) =>
  invoke<void>("rename_environment", { id, name });
export const deleteEnvironment = (id: string) => invoke<void>("delete_environment", { id });
export const setActiveEnvironment = (id: string | null) =>
  invoke<void>("set_active_environment", { id });
export const getActiveEnvironment = () =>
  invoke<Environment | null>("get_active_environment");

// ---------- Variables ----------

export const listVariables = (environmentId: string | null) =>
  invoke<Variable[]>("list_variables", { environmentId });
export const upsertVariable = (input: UpsertVariableInput) =>
  invoke<Variable>("upsert_variable", { input });
export const deleteVariable = (id: string) => invoke<void>("delete_variable", { id });

// ---------- Saved requests ----------

export const listSavedRequests = () => invoke<SavedRequest[]>("list_saved_requests");
export const getSavedRequest = (id: string) => invoke<SavedRequest>("get_saved_request", { id });
export const createSavedRequest = (input: SavedRequestInput) =>
  invoke<SavedRequest>("create_saved_request", { input });
export const updateSavedRequest = (id: string, input: SavedRequestInput) =>
  invoke<SavedRequest>("update_saved_request", { id, input });
export const deleteSavedRequest = (id: string) => invoke<void>("delete_saved_request", { id });
export const reorderSavedRequests = (orderedIds: string[]) =>
  invoke<void>("reorder_saved_requests", { orderedIds });

// ---------- Tabs ----------

export const listTabs = () => invoke<Tab[]>("list_tabs");
export const upsertTab = (input: UpsertTabInput) => invoke<Tab>("upsert_tab", { input });
export const deleteTab = (id: string) => invoke<void>("delete_tab", { id });
export const setActiveTabId = (id: string | null) => invoke<void>("set_active_tab_id", { id });
export const getActiveTabId = () => invoke<string | null>("get_active_tab_id");

// ---------- HTTP ----------

export const sendHttpRequest = (input: SendHttpRequestInput) =>
  invoke<HistoryRequest>("send_http_request", { input });

// ---------- WebSocket ----------

export const wsConnect = (input: WsConnectInput) =>
  invoke<WsConnectResult>("ws_connect", { input });
export const wsSend = (connectionId: string, payload: string, messageType: WsMessageTypeInput) =>
  invoke<void>("ws_send", { connectionId, payload, messageType });
export const wsDisconnect = (connectionId: string, code?: number, reason?: string) =>
  invoke<void>("ws_disconnect", { connectionId, code: code ?? null, reason: reason ?? null });

// ---------- History ----------

export const listHttpHistory = (limit: number, offset: number, search?: string) =>
  invoke<HistoryRequestSummary[]>("list_http_history", {
    limit,
    offset,
    search: search ?? null,
  });
export const getHttpHistoryEntry = (id: string) =>
  invoke<HistoryRequest>("get_http_history_entry", { id });
export const deleteHttpHistoryEntry = (id: string) =>
  invoke<void>("delete_http_history_entry", { id });
export const clearHttpHistory = () => invoke<void>("clear_http_history");

export const listWsHistory = (limit: number, offset: number) =>
  invoke<WsSessionSummary[]>("list_ws_history", { limit, offset });
export const getWsHistorySession = (id: string) =>
  invoke<WsSessionDetail>("get_ws_history_session", { id });
export const deleteWsHistorySession = (id: string) =>
  invoke<void>("delete_ws_history_session", { id });
export const clearWsHistory = () => invoke<void>("clear_ws_history");

// ---------- Import / export ----------

export const exportData = (path: string) => invoke<void>("export_data", { path });
export const importData = (path: string, mode: ImportMode) =>
  invoke<ImportSummary>("import_data", { path, mode });

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as AppError).message);
  }
  return String(err);
}
