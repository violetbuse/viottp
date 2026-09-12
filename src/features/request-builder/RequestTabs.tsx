import { Plus, X, Save, Globe, Radio } from "lucide-react";
import { IconButton } from "../../components/ui";
import { useTabsStore, draftsEqual } from "../../stores/tabs-store";
import { useSavedRequestsStore } from "../../stores/saved-requests-store";
import type { SavedRequestInput } from "../../lib/types";

export function RequestTabs() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const openNewTab = useTabsStore((s) => s.openNewTab);
  const markSaved = useTabsStore((s) => s.markSaved);
  const savedRequestsStore = useSavedRequestsStore();

  async function handleSave(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    let name = tab.draft.name;
    if (!tab.savedRequestId || name === "Untitled") {
      const input = window.prompt("Name this request:", name === "Untitled" ? "" : name);
      if (!input) return;
      name = input;
    }

    const input: SavedRequestInput = {
      kind: tab.draft.kind,
      name,
      method: tab.draft.kind === "http" ? tab.draft.method : null,
      url: tab.draft.url,
      headers: tab.draft.headers.filter((h) => h.key.trim()),
      query_params: tab.draft.queryParams.filter((q) => q.key.trim()),
      body: tab.draft.kind === "http" ? tab.draft.body : null,
      body_type: tab.draft.kind === "http" ? tab.draft.bodyType : null,
      ws_init_message: tab.draft.kind === "ws" ? tab.draft.wsInitMessage : null,
    };

    const saved = tab.savedRequestId
      ? await savedRequestsStore.update(tab.savedRequestId, input)
      : await savedRequestsStore.create(input);
    markSaved(tabId, saved);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-base px-1">
      {tabs.map((tab) => {
        const dirty = !draftsEqual(tab.draft, tab.baseline);
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs transition-colors ${
              isActive
                ? "border-violet-500 bg-panel text-ink"
                : "border-transparent text-ink-3 hover:bg-violet-600/10 hover:text-ink-2"
            }`}
          >
            {tab.draft.kind === "ws" ? <Radio size={11} /> : <Globe size={11} />}
            <span className="max-w-[140px] truncate">{tab.draft.name}</span>
            {dirty && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-violet-400"
              title="Save"
            >
              <Save size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400"
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <div className="flex shrink-0 items-center gap-0.5 pl-1">
        <IconButton label="New HTTP request" onClick={() => openNewTab("http")}>
          <Plus size={14} />
        </IconButton>
        <IconButton label="New WebSocket connection" onClick={() => openNewTab("ws")}>
          <Radio size={12} />
        </IconButton>
      </div>
    </div>
  );
}
