import { create } from "zustand";
import * as api from "../lib/tauri-api";
import type { HistoryRequestSummary, WsSessionSummary } from "../lib/types";

const PAGE_SIZE = 100;

interface HistoryState {
  httpItems: HistoryRequestSummary[];
  wsItems: WsSessionSummary[];
  search: string;
  refreshHttp: () => Promise<void>;
  refreshWs: () => Promise<void>;
  setSearch: (search: string) => void;
  removeHttp: (id: string) => Promise<void>;
  clearHttp: () => Promise<void>;
  removeWs: (id: string) => Promise<void>;
  clearWs: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  httpItems: [],
  wsItems: [],
  search: "",

  refreshHttp: async () => {
    const items = await api.listHttpHistory(PAGE_SIZE, 0, get().search || undefined);
    set({ httpItems: items });
  },

  refreshWs: async () => {
    const items = await api.listWsHistory(PAGE_SIZE, 0);
    set({ wsItems: items });
  },

  setSearch: (search: string) => set({ search }),

  removeHttp: async (id: string) => {
    await api.deleteHttpHistoryEntry(id);
    set({ httpItems: get().httpItems.filter((h) => h.id !== id) });
  },

  clearHttp: async () => {
    await api.clearHttpHistory();
    set({ httpItems: [] });
  },

  removeWs: async (id: string) => {
    await api.deleteWsHistorySession(id);
    set({ wsItems: get().wsItems.filter((w) => w.id !== id) });
  },

  clearWs: async () => {
    await api.clearWsHistory();
    set({ wsItems: [] });
  },
}));
