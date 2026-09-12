import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "./features/sidebar/Sidebar";
import { RequestTabs } from "./features/request-builder/RequestTabs";
import { RequestBuilder } from "./features/request-builder/RequestBuilder";
import { useTabsStore } from "./stores/tabs-store";

function App() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const openNewTab = useTabsStore((s) => s.openNewTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const hydrateTabs = useTabsStore((s) => s.hydrateTabs);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  useEffect(() => {
    (async () => {
      const restored = await hydrateTabs();
      if (!restored && useTabsStore.getState().tabs.length === 0) {
        openNewTab("http");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "t") {
        e.preventDefault();
        openNewTab("http");
      } else if (e.key === "w" && activeTabId) {
        e.preventDefault();
        closeTab(activeTabId);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, openNewTab, closeTab]);

  return (
    <div className="h-screen w-screen bg-base text-ink">
      <PanelGroup direction="horizontal" className="h-full">
        <Panel defaultSize={22} minSize={16} maxSize={38}>
          <Sidebar />
        </Panel>
        <PanelResizeHandle className="w-1 bg-line hover:bg-violet-600 transition-colors" />
        <Panel minSize={40}>
          <div className="flex h-full flex-col bg-base">
            <RequestTabs />
            <div className="min-h-0 flex-1">
              {activeTab ? (
                <RequestBuilder tab={activeTab} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-3">
                  Open a request to get started.
                </div>
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
