import { useState } from "react";
import { Plug, Unplug } from "lucide-react";
import { Button, Input } from "../../components/ui";
import { KeyValueEditor } from "./KeyValueEditor";
import type { TabState } from "../../stores/tabs-store";
import { useTabsStore } from "../../stores/tabs-store";
import { useEnvironmentsStore } from "../../stores/environments-store";
import { useVariablesStore } from "../../stores/variables-store";
import { findUnresolvedVariablesMany, resolveVariables } from "../../lib/interpolate";
import { WsMessageLog } from "../response-panel/WsMessageLog";

const SECTIONS = ["Headers", "Init message"] as const;
type Section = (typeof SECTIONS)[number];

const statusColors: Record<string, string> = {
  idle: "bg-line-2",
  connecting: "bg-amber-500 animate-pulse",
  open: "bg-emerald-500",
  closed: "bg-ink-3",
  error: "bg-red-500",
};

export function WsRequestForm({ tab }: { tab: TabState }) {
  const [section, setSection] = useState<Section>("Headers");
  const updateDraft = useTabsStore((s) => s.updateDraft);
  const connectWs = useTabsStore((s) => s.connectWs);
  const disconnectWs = useTabsStore((s) => s.disconnectWs);
  const activeEnvironmentId = useEnvironmentsStore((s) => s.activeEnvironmentId);
  const mergedMap = useVariablesStore((s) => s.mergedMap);

  const isOpen = tab.wsStatus === "open" || tab.wsStatus === "connecting";

  async function handleToggle() {
    if (isOpen) {
      await disconnectWs(tab.id);
      return;
    }
    const vars = mergedMap(activeEnvironmentId);
    const resolvedUrl = resolveVariables(tab.draft.url, vars);
    const resolvedHeaders = tab.draft.headers.map((h) => ({
      ...h,
      key: resolveVariables(h.key, vars),
      value: resolveVariables(h.value, vars),
    }));
    const unresolved = findUnresolvedVariablesMany(
      [tab.draft.url, ...tab.draft.headers.map((h) => h.value)],
      vars,
    );
    if (unresolved.length > 0) {
      const proceed = window.confirm(
        `Unresolved variable${unresolved.length > 1 ? "s" : ""}: ${unresolved.join(", ")}\n\nConnect anyway?`,
      );
      if (!proceed) return;
    }
    await connectWs(tab.id, { url: resolvedUrl, headers: resolvedHeaders }, activeEnvironmentId);
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[tab.wsStatus]}`} />
        <Input
          value={tab.draft.url}
          onChange={(e) => updateDraft(tab.id, { url: e.target.value })}
          placeholder="wss://echo.example.com/{{path}}"
          disabled={isOpen}
          className="flex-1"
        />
        <Button
          variant={isOpen ? "danger" : "primary"}
          onClick={handleToggle}
          disabled={!tab.draft.url || tab.wsStatus === "connecting"}
        >
          {isOpen ? <Unplug size={14} /> : <Plug size={14} />}
          {tab.wsStatus === "connecting" ? "Connecting…" : isOpen ? "Disconnect" : "Connect"}
        </Button>
      </div>
      {tab.wsError && <p className="text-xs text-red-400">{tab.wsError}</p>}

      <div className="flex gap-1 border-b border-line">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              section === s
                ? "border-violet-500 text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === "Headers" && (
        <div className="max-h-32 overflow-y-auto">
          <KeyValueEditor
            entries={tab.draft.headers}
            onChange={(headers) => updateDraft(tab.id, { headers })}
            keyPlaceholder="Header"
          />
        </div>
      )}
      {section === "Init message" && (
        <Input
          value={tab.draft.wsInitMessage}
          onChange={(e) => updateDraft(tab.id, { wsInitMessage: e.target.value })}
          placeholder="Sent automatically right after connecting (optional)"
        />
      )}

      <div className="min-h-0 flex-1">
        <WsMessageLog tab={tab} />
      </div>
    </div>
  );
}
