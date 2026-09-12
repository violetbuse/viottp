import { useState } from "react";
import { EnvironmentSwitcher } from "./EnvironmentSwitcher";
import { VariablesModal } from "./VariablesModal";
import { SavedRequestsList } from "./SavedRequestsList";
import { HistoryList } from "./HistoryList";
import { ImportExportPanel } from "../import-export/ImportExportPanel";

export function Sidebar() {
  const [section, setSection] = useState<"saved" | "history">("saved");
  const [variablesOpen, setVariablesOpen] = useState(false);

  return (
    <div className="flex h-full flex-col border-r border-line bg-panel">
      <EnvironmentSwitcher onManageVariables={() => setVariablesOpen(true)} />

      <div className="flex gap-1 border-b border-line px-2 pb-2">
        {(["saved", "history"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
              section === s
                ? "bg-violet-600/20 text-violet-200"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {section === "saved" ? <SavedRequestsList /> : <HistoryList />}
      </div>

      <ImportExportPanel />

      <VariablesModal open={variablesOpen} onOpenChange={setVariablesOpen} />
    </div>
  );
}
