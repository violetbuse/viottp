import { create } from "zustand";
import * as api from "../lib/tauri-api";
import type { Environment } from "../lib/types";

interface EnvironmentsState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<Environment>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
}

export const useEnvironmentsStore = create<EnvironmentsState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  loaded: false,

  refresh: async () => {
    const [environments, active] = await Promise.all([
      api.listEnvironments(),
      api.getActiveEnvironment(),
    ]);
    set({ environments, activeEnvironmentId: active?.id ?? null, loaded: true });
  },

  create: async (name: string) => {
    const env = await api.createEnvironment(name);
    set({ environments: [...get().environments, env] });
    return env;
  },

  rename: async (id: string, name: string) => {
    await api.renameEnvironment(id, name);
    set({
      environments: get().environments.map((e) => (e.id === id ? { ...e, name } : e)),
    });
  },

  remove: async (id: string) => {
    await api.deleteEnvironment(id);
    const wasActive = get().activeEnvironmentId === id;
    set({
      environments: get().environments.filter((e) => e.id !== id),
      activeEnvironmentId: wasActive ? null : get().activeEnvironmentId,
    });
  },

  setActive: async (id: string | null) => {
    await api.setActiveEnvironment(id);
    set({ activeEnvironmentId: id });
  },
}));
