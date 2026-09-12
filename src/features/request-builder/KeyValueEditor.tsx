import { Trash2, Plus } from "lucide-react";
import { Input, IconButton } from "../../components/ui";
import type { KeyValueEntry } from "../../lib/types";

interface KeyValueEditorProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  function update(index: number, patch: Partial<KeyValueEntry>) {
    const next = entries.map((e, i) => (i === index ? { ...e, ...patch } : e));
    ensureTrailingRow(next);
  }

  function remove(index: number) {
    const next = entries.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ key: "", value: "", enabled: true }]);
  }

  function ensureTrailingRow(next: KeyValueEntry[]) {
    const last = next[next.length - 1];
    if (last && (last.key.trim() || last.value.trim())) {
      onChange([...next, { key: "", value: "", enabled: true }]);
    } else {
      onChange(next);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={entry.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
            className="h-4 w-4 accent-violet-600"
          />
          <Input
            value={entry.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="flex-1"
          />
          <Input
            value={entry.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="flex-1"
          />
          <IconButton label="Remove" onClick={() => remove(i)}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}
      {entries.length === 0 && (
        <button
          onClick={() => onChange([{ key: "", value: "", enabled: true }])}
          className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink-2"
        >
          <Plus size={12} /> Add row
        </button>
      )}
    </div>
  );
}
