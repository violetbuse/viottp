import { create } from "zustand";
import * as api from "../lib/tauri-api";
import { buildVariableMap } from "../lib/interpolate";
import type { UpsertVariableInput, Variable } from "../lib/types";

interface VariablesState {
  global: Variable[];
  byEnvironment: Record<string, Variable[]>;
  loadGlobal: () => Promise<void>;
  loadForEnvironment: (envId: string) => Promise<void>;
  upsert: (input: UpsertVariableInput) => Promise<void>;
  remove: (id: string, environmentId: string | null) => Promise<void>;
  mergedMap: (activeEnvironmentId: string | null) => Map<string, string>;
}

export const useVariablesStore = create<VariablesState>((set, get) => ({
  global: [],
  byEnvironment: {},

  loadGlobal: async () => {
    const vars = await api.listVariables(null);
    set({ global: vars });
  },

  loadForEnvironment: async (envId: string) => {
    const vars = await api.listVariables(envId);
    set({ byEnvironment: { ...get().byEnvironment, [envId]: vars } });
  },

  upsert: async (input: UpsertVariableInput) => {
    const saved = await api.upsertVariable(input);
    if (saved.environment_id === null) {
      const existing = get().global;
      const idx = existing.findIndex((v) => v.id === saved.id);
      const next = idx >= 0 ? existing.map((v) => (v.id === saved.id ? saved : v)) : [...existing, saved];
      set({ global: next });
    } else {
      const envId = saved.environment_id;
      const existing = get().byEnvironment[envId] ?? [];
      const idx = existing.findIndex((v) => v.id === saved.id);
      const next = idx >= 0 ? existing.map((v) => (v.id === saved.id ? saved : v)) : [...existing, saved];
      set({ byEnvironment: { ...get().byEnvironment, [envId]: next } });
    }
  },

  remove: async (id: string, environmentId: string | null) => {
    await api.deleteVariable(id);
    if (environmentId === null) {
      set({ global: get().global.filter((v) => v.id !== id) });
    } else {
      set({
        byEnvironment: {
          ...get().byEnvironment,
          [environmentId]: (get().byEnvironment[environmentId] ?? []).filter((v) => v.id !== id),
        },
      });
    }
  },

  mergedMap: (activeEnvironmentId: string | null) => {
    const envVars = activeEnvironmentId ? get().byEnvironment[activeEnvironmentId] ?? [] : [];
    return buildVariableMap(get().global, envVars);
  },
}));
