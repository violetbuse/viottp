import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Modal, Input, Select } from "../../components/ui";
import { useEnvironmentsStore } from "../../stores/environments-store";
import { useVariablesStore } from "../../stores/variables-store";
import type { Variable } from "../../lib/types";

export function VariablesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const environments = useEnvironmentsStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentsStore((s) => s.activeEnvironmentId);
  const [scope, setScope] = useState<string>("global");
  const global = useVariablesStore((s) => s.global);
  const byEnvironment = useVariablesStore((s) => s.byEnvironment);
  const loadGlobal = useVariablesStore((s) => s.loadGlobal);
  const loadForEnvironment = useVariablesStore((s) => s.loadForEnvironment);
  const upsert = useVariablesStore((s) => s.upsert);
  const remove = useVariablesStore((s) => s.remove);

  useEffect(() => {
    if (open) setScope(activeEnvironmentId ?? "global");
  }, [open, activeEnvironmentId]);

  useEffect(() => {
    if (!open) return;
    if (scope === "global") loadGlobal();
    else loadForEnvironment(scope);
  }, [open, scope, loadGlobal, loadForEnvironment]);

  const rows: Variable[] = scope === "global" ? global : byEnvironment[scope] ?? [];
  const envId = scope === "global" ? null : scope;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Variables" width="640px">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-ink-3">Scope:</span>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-48">
          <option value="global">Global</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </Select>
        <span className="text-[11px] text-ink-3">
          {scope === "global"
            ? "Available everywhere"
            : "Overrides globals of the same name when this environment is active"}
        </span>
      </div>

      <VariableTable
        rows={rows}
        environmentId={envId}
        onUpsert={upsert}
        onRemove={(id) => remove(id, envId)}
      />
    </Modal>
  );
}

function VariableTable({
  rows,
  environmentId,
  onUpsert,
  onRemove,
}: {
  rows: Variable[];
  environmentId: string | null;
  onUpsert: (input: {
    id?: string | null;
    environment_id: string | null;
    key: string;
    value: string;
    is_secret: boolean;
    enabled: boolean;
  }) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState({ key: "", value: "", is_secret: false });

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addDraft() {
    if (!draft.key.trim()) return;
    await onUpsert({
      environment_id: environmentId,
      key: draft.key,
      value: draft.value,
      is_secret: draft.is_secret,
      enabled: true,
    });
    setDraft({ key: "", value: "", is_secret: false });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[24px_1fr_1fr_60px_28px] items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-ink-3">
        <span />
        <span>Key</span>
        <span>Value</span>
        <span>Secret</span>
        <span />
      </div>
      {rows.map((v) => (
        <div key={v.id} className="grid grid-cols-[24px_1fr_1fr_60px_28px] items-center gap-2">
          <input
            type="checkbox"
            checked={v.enabled}
            onChange={(e) => onUpsert({ id: v.id, environment_id: environmentId, key: v.key, value: v.value, is_secret: v.is_secret, enabled: e.target.checked })}
            className="h-4 w-4 accent-violet-600"
          />
          <Input
            defaultValue={v.key}
            onBlur={(e) =>
              e.target.value !== v.key &&
              onUpsert({ id: v.id, environment_id: environmentId, key: e.target.value, value: v.value, is_secret: v.is_secret, enabled: v.enabled })
            }
          />
          <div className="relative">
            <Input
              type={v.is_secret && !revealed.has(v.id) ? "password" : "text"}
              defaultValue={v.value}
              onBlur={(e) =>
                e.target.value !== v.value &&
                onUpsert({ id: v.id, environment_id: environmentId, key: v.key, value: e.target.value, is_secret: v.is_secret, enabled: v.enabled })
              }
              className="pr-7"
            />
            {v.is_secret && (
              <button
                onClick={() => toggleReveal(v.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-violet-300"
              >
                {revealed.has(v.id) ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
          </div>
          <input
            type="checkbox"
            checked={v.is_secret}
            onChange={(e) => onUpsert({ id: v.id, environment_id: environmentId, key: v.key, value: v.value, is_secret: e.target.checked, enabled: v.enabled })}
            className="h-4 w-4 accent-violet-600 justify-self-center"
          />
          <button onClick={() => onRemove(v.id)} className="text-ink-3 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="grid grid-cols-[24px_1fr_1fr_60px_28px] items-center gap-2 pt-1.5 border-t border-line mt-1">
        <span />
        <Input
          placeholder="new_var"
          value={draft.key}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && addDraft()}
        />
        <Input
          placeholder="value"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && addDraft()}
        />
        <input
          type="checkbox"
          checked={draft.is_secret}
          onChange={(e) => setDraft({ ...draft, is_secret: e.target.checked })}
          className="h-4 w-4 accent-violet-600 justify-self-center"
        />
        <button onClick={addDraft} className="text-ink-3 hover:text-violet-400 text-lg leading-none">
          +
        </button>
      </div>
    </div>
  );
}
