import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import * as api from "../lib/tauri-api";
import { errorMessage } from "../lib/tauri-api";
import { useHistoryStore } from "./history-store";
import type {
  BodyType,
  HistoryRequest,
  KeyValueEntry,
  SavedRequest,
  SavedRequestKind,
  WsFrontendEvent,
  WsMessage,
  WsMessageTypeInput,
} from "../lib/types";

export interface RequestDraft {
  kind: SavedRequestKind;
  name: string;
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: string;
  bodyType: BodyType;
  wsInitMessage: string;
}

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface TabState {
  id: string;
  savedRequestId: string | null;
  draft: RequestDraft;
  baseline: RequestDraft;
  httpResponse: HistoryRequest | null;
  httpLoading: boolean;
  httpError: string | null;
  wsConnectionId: string | null;
  wsSessionId: string | null;
  wsStatus: WsStatus;
  wsMessages: WsMessage[];
  wsError: string | null;
}

function blankDraft(kind: SavedRequestKind): RequestDraft {
  return {
    kind,
    name: "Untitled",
    method: "GET",
    url: "",
    headers: [{ key: "", value: "", enabled: true }],
    queryParams: [{ key: "", value: "", enabled: true }],
    body: "",
    bodyType: kind === "http" ? "json" : "none",
    wsInitMessage: "",
  };
}

function draftFromSaved(saved: SavedRequest): RequestDraft {
  return {
    kind: saved.kind,
    name: saved.name,
    method: saved.method ?? "GET",
    url: saved.url,
    headers: saved.headers.length ? saved.headers : [{ key: "", value: "", enabled: true }],
    queryParams: saved.query_params.length
      ? saved.query_params
      : [{ key: "", value: "", enabled: true }],
    body: saved.body ?? "",
    bodyType: saved.body_type ?? "json",
    wsInitMessage: saved.ws_init_message ?? "",
  };
}

export function draftsEqual(a: RequestDraft, b: RequestDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface TabsState {
  tabs: TabState[];
  activeTabId: string | null;
  connectionToTab: Record<string, string>;

  openNewTab: (kind: SavedRequestKind) => string;
  openSavedRequest: (saved: SavedRequest) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateDraft: (id: string, patch: Partial<RequestDraft>) => void;
  markSaved: (id: string, saved: SavedRequest) => void;

  sendHttp: (id: string, resolved: { url: string; headers: KeyValueEntry[]; body: string | null }, environmentId: string | null) => Promise<void>;
  connectWs: (id: string, resolved: { url: string; headers: KeyValueEntry[] }, environmentId: string | null) => Promise<void>;
  sendWsMessage: (id: string, payload: string, messageType: WsMessageTypeInput) => Promise<void>;
  disconnectWs: (id: string) => Promise<void>;
}

let listenerStarted = false;

export const useTabsStore = create<TabsState>((set, get) => {
  if (!listenerStarted) {
    listenerStarted = true;
    listen<WsFrontendEvent>("ws:event", (event) => {
      const payload = event.payload;
      const tabId = get().connectionToTab[payload.connection_id];
      if (!tabId) return;

      if (payload.kind === "message") {
        set({
          tabs: get().tabs.map((t) =>
            t.id === tabId ? { ...t, wsMessages: [...t.wsMessages, payload.message] } : t,
          ),
        });
      } else if (payload.kind === "closed") {
        set({
          tabs: get().tabs.map((t) => (t.id === tabId ? { ...t, wsStatus: "closed" } : t)),
        });
        useHistoryStore.getState().refreshWs();
      } else if (payload.kind === "error") {
        set({
          tabs: get().tabs.map((t) =>
            t.id === tabId ? { ...t, wsStatus: "error", wsError: payload.message } : t,
          ),
        });
        useHistoryStore.getState().refreshWs();
      }
    });
  }

  return {
    tabs: [],
    activeTabId: null,
    connectionToTab: {},

    openNewTab: (kind) => {
      const id = crypto.randomUUID();
      const draft = blankDraft(kind);
      const tab: TabState = {
        id,
        savedRequestId: null,
        draft,
        baseline: draft,
        httpResponse: null,
        httpLoading: false,
        httpError: null,
        wsConnectionId: null,
        wsSessionId: null,
        wsStatus: "idle",
        wsMessages: [],
        wsError: null,
      };
      set({ tabs: [...get().tabs, tab], activeTabId: id });
      return id;
    },

    openSavedRequest: (saved) => {
      const existing = get().tabs.find((t) => t.savedRequestId === saved.id);
      if (existing) {
        set({ activeTabId: existing.id });
        return;
      }
      const id = crypto.randomUUID();
      const draft = draftFromSaved(saved);
      const tab: TabState = {
        id,
        savedRequestId: saved.id,
        draft,
        baseline: draft,
        httpResponse: null,
        httpLoading: false,
        httpError: null,
        wsConnectionId: null,
        wsSessionId: null,
        wsStatus: "idle",
        wsMessages: [],
        wsError: null,
      };
      set({ tabs: [...get().tabs, tab], activeTabId: id });
    },

    closeTab: (id) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (tab?.wsConnectionId) {
        api.wsDisconnect(tab.wsConnectionId).catch(() => {});
      }
      const remaining = get().tabs.filter((t) => t.id !== id);
      const wasActive = get().activeTabId === id;
      set({
        tabs: remaining,
        activeTabId: wasActive ? (remaining[remaining.length - 1]?.id ?? null) : get().activeTabId,
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateDraft: (id, patch) => {
      set({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, draft: { ...t.draft, ...patch } } : t)),
      });
    },

    markSaved: (id, saved) => {
      const draft = draftFromSaved(saved);
      set({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, savedRequestId: saved.id, draft, baseline: draft } : t,
        ),
      });
    },

    sendHttp: async (id, resolved, environmentId) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;
      set({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, httpLoading: true, httpError: null } : t,
        ),
      });
      try {
        const result = await api.sendHttpRequest({
          method: tab.draft.method,
          url: resolved.url,
          headers: resolved.headers,
          body: tab.draft.bodyType === "none" ? null : resolved.body,
          body_type: tab.draft.bodyType,
          timeout_ms: 30000,
          danger_accept_invalid_certs: false,
          follow_redirects: true,
          saved_request_id: tab.savedRequestId,
          environment_id_for_log: environmentId,
        });
        set({
          tabs: get().tabs.map((t) =>
            t.id === id ? { ...t, httpLoading: false, httpResponse: result } : t,
          ),
        });
      } catch (err) {
        set({
          tabs: get().tabs.map((t) =>
            t.id === id ? { ...t, httpLoading: false, httpError: errorMessage(err) } : t,
          ),
        });
      }
      useHistoryStore.getState().refreshHttp();
    },

    connectWs: async (id, resolved, environmentId) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab) return;
      set({
        tabs: get().tabs.map((t) =>
          t.id === id
            ? { ...t, wsStatus: "connecting", wsError: null, wsMessages: [] }
            : t,
        ),
      });
      try {
        const result = await api.wsConnect({
          url: resolved.url,
          headers: resolved.headers,
          saved_request_id: tab.savedRequestId,
          environment_id_for_log: environmentId,
        });
        set({
          connectionToTab: { ...get().connectionToTab, [result.connection_id]: id },
          tabs: get().tabs.map((t) =>
            t.id === id
              ? {
                  ...t,
                  wsConnectionId: result.connection_id,
                  wsSessionId: result.session.id,
                  wsStatus: "open",
                }
              : t,
          ),
        });
        if (tab.draft.wsInitMessage.trim()) {
          await api.wsSend(result.connection_id, tab.draft.wsInitMessage, "text");
        }
      } catch (err) {
        set({
          tabs: get().tabs.map((t) =>
            t.id === id ? { ...t, wsStatus: "error", wsError: errorMessage(err) } : t,
          ),
        });
      }
      useHistoryStore.getState().refreshWs();
    },

    sendWsMessage: async (id, payload, messageType) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab?.wsConnectionId) return;
      try {
        await api.wsSend(tab.wsConnectionId, payload, messageType);
      } catch (err) {
        set({
          tabs: get().tabs.map((t) =>
            t.id === id ? { ...t, wsError: errorMessage(err) } : t,
          ),
        });
      }
    },

    disconnectWs: async (id) => {
      const tab = get().tabs.find((t) => t.id === id);
      if (!tab?.wsConnectionId) return;
      await api.wsDisconnect(tab.wsConnectionId).catch(() => {});
      set({
        tabs: get().tabs.map((t) => (t.id === id ? { ...t, wsStatus: "closed" } : t)),
      });
    },
  };
});
