import { create } from "zustand";
import * as api from "../lib/tauri-api";
import type { SavedRequest, SavedRequestInput } from "../lib/types";

interface SavedRequestsState {
  items: SavedRequest[];
  loaded: boolean;
  refresh: () => Promise<void>;
  create: (input: SavedRequestInput) => Promise<SavedRequest>;
  update: (id: string, input: SavedRequestInput) => Promise<SavedRequest>;
  remove: (id: string) => Promise<void>;
}

export const useSavedRequestsStore = create<SavedRequestsState>((set, get) => ({
  items: [],
  loaded: false,

  refresh: async () => {
    const items = await api.listSavedRequests();
    set({ items, loaded: true });
  },

  create: async (input: SavedRequestInput) => {
    const saved = await api.createSavedRequest(input);
    set({ items: [...get().items, saved] });
    return saved;
  },

  update: async (id: string, input: SavedRequestInput) => {
    const saved = await api.updateSavedRequest(id, input);
    set({ items: get().items.map((r) => (r.id === id ? saved : r)) });
    return saved;
  },

  remove: async (id: string) => {
    await api.deleteSavedRequest(id);
    set({ items: get().items.filter((r) => r.id !== id) });
  },
}));
