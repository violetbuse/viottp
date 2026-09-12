import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { HttpRequestForm } from "./HttpRequestForm";
import { WsRequestForm } from "./WsRequestForm";
import { ResponsePanel } from "../response-panel/ResponsePanel";
import type { TabState } from "../../stores/tabs-store";

export function RequestBuilder({ tab }: { tab: TabState }) {
  if (tab.draft.kind === "ws") {
    return (
      <div className="h-full">
        <WsRequestForm tab={tab} />
      </div>
    );
  }

  return (
    <PanelGroup direction="vertical" className="h-full">
      <Panel defaultSize={45} minSize={20}>
        <HttpRequestForm tab={tab} />
      </Panel>
      <PanelResizeHandle className="h-1 bg-panel-3 hover:bg-violet-600 transition-colors" />
      <Panel minSize={20}>
        <ResponsePanel tab={tab} />
      </Panel>
    </PanelGroup>
  );
}
