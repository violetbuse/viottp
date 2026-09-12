import { useState } from "react";
import { CodeEditor } from "../../components/CodeEditor";
import { Badge } from "../../components/ui";
import {
  formatBytes,
  formatDuration,
  getHeaderValue,
  prettyPrintResponseBody,
  statusColorClass,
} from "../../lib/format";
import type { TabState } from "../../stores/tabs-store";

const TABS = ["Body", "Headers"] as const;
type PanelTab = (typeof TABS)[number];

export function ResponsePanel({ tab }: { tab: TabState }) {
  const [panelTab, setPanelTab] = useState<PanelTab>("Body");
  const response = tab.httpResponse;

  if (tab.httpLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-ink-3">Sending…</div>;
  }

  if (tab.httpError) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-400">
        {tab.httpError}
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-3">
        Send a request to see the response here.
      </div>
    );
  }

  if (response.error_message) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="text-xs text-ink-3">{formatDuration(response.duration_ms)}</div>
        <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {response.error_message}
        </div>
      </div>
    );
  }

  const contentType = getHeaderValue(response.response_headers, "content-type");
  const { pretty, language } =
    response.response_body_encoding === "text"
      ? prettyPrintResponseBody(contentType, response.response_body)
      : { pretty: "", language: "text" as const };

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center gap-3 text-xs">
        <span className={`text-sm font-bold ${statusColorClass(response.status_code)}`}>
          {response.status_code ?? "ERR"} {response.status_text}
        </span>
        <span className="text-ink-3">{formatDuration(response.duration_ms)}</span>
        <span className="text-ink-3">{formatBytes(response.response_size_bytes)}</span>
        {response.response_body_encoding === "base64" && <Badge className="bg-panel-3 text-ink-2">binary</Badge>}
      </div>

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setPanelTab(t)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              panelTab === t
                ? "border-violet-500 text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {t}
            {t === "Headers" && response.response_headers.length > 0
              ? ` (${response.response_headers.length})`
              : ""}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {panelTab === "Body" &&
          (response.response_body_encoding === "base64" ? (
            <div className="p-4 text-sm text-ink-3">
              Binary response ({formatBytes(response.response_size_bytes)}). Preview not available.
            </div>
          ) : (
            <CodeEditor value={pretty} language={language} readOnly />
          ))}
        {panelTab === "Headers" && (
          <div className="h-full overflow-auto rounded-md border border-line">
            <table className="w-full text-xs">
              <tbody>
                {response.response_headers.map((h, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-2 py-1.5 font-mono text-ink-2 align-top">{h.key}</td>
                    <td className="px-2 py-1.5 font-mono text-ink break-all">{h.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
