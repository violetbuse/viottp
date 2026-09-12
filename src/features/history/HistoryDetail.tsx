import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Modal, Button } from "../../components/ui";
import { CodeEditor } from "../../components/CodeEditor";
import * as api from "../../lib/tauri-api";
import { formatBytes, formatDuration, getHeaderValue, prettyPrintResponseBody, statusColorClass } from "../../lib/format";
import { useTabsStore } from "../../stores/tabs-store";
import type { HistoryRequest, WsSessionDetail } from "../../lib/types";

interface HistoryDetailProps {
  httpId: string | null;
  wsId: string | null;
  onClose: () => void;
}

export function HistoryDetail({ httpId, wsId, onClose }: HistoryDetailProps) {
  const [http, setHttp] = useState<HistoryRequest | null>(null);
  const [ws, setWs] = useState<WsSessionDetail | null>(null);
  const openNewTab = useTabsStore((s) => s.openNewTab);
  const updateDraft = useTabsStore((s) => s.updateDraft);

  useEffect(() => {
    if (httpId) api.getHttpHistoryEntry(httpId).then(setHttp);
    if (wsId) api.getWsHistorySession(wsId).then(setWs);
    if (!httpId) setHttp(null);
    if (!wsId) setWs(null);
  }, [httpId, wsId]);

  function restoreHttp() {
    if (!http) return;
    const id = openNewTab("http");
    updateDraft(id, {
      name: `${http.method} ${http.url}`.slice(0, 60),
      method: http.method,
      url: http.url,
      headers: http.request_headers.length ? http.request_headers : [{ key: "", value: "", enabled: true }],
      body: http.request_body ?? "",
      bodyType: http.request_body ? "json" : "none",
    });
    onClose();
  }

  function restoreWs() {
    if (!ws) return;
    const id = openNewTab("ws");
    updateDraft(id, {
      name: "Restored WS",
      url: ws.session.url,
      headers: ws.session.request_headers.length
        ? ws.session.request_headers
        : [{ key: "", value: "", enabled: true }],
    });
    onClose();
  }

  const open = Boolean(httpId || wsId);

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={httpId ? "Request details" : "WebSocket session"} width="620px">
      {http && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold">{http.method}</span>
            <span className={`font-bold ${statusColorClass(http.status_code)}`}>
              {http.status_code ?? "ERR"} {http.status_text}
            </span>
            <span className="text-ink-3">{formatDuration(http.duration_ms)}</span>
            <span className="text-ink-3">{formatBytes(http.response_size_bytes)}</span>
          </div>
          <p className="break-all text-xs text-ink-2">{http.url}</p>
          {http.error_message && <p className="text-xs text-red-400">{http.error_message}</p>}
          <div>
            <p className="mb-1 text-[11px] uppercase text-ink-3">Request headers</p>
            <div className="max-h-24 overflow-auto rounded border border-line p-1.5 text-xs">
              {http.request_headers.map((h, i) => (
                <div key={i} className="font-mono text-ink-2">
                  {h.key}: {h.value}
                </div>
              ))}
            </div>
          </div>
          {http.response_body && http.response_body_encoding === "text" && (
            <div className="h-56">
              <p className="mb-1 text-[11px] uppercase text-ink-3">Response body</p>
              {(() => {
                const { pretty, language } = prettyPrintResponseBody(
                  getHeaderValue(http.response_headers, "content-type"),
                  http.response_body,
                );
                return <CodeEditor value={pretty} language={language} readOnly />;
              })()}
            </div>
          )}
          {http.response_body && http.response_body_encoding === "base64" && (
            <p className="text-sm text-ink-3">
              Binary response ({formatBytes(http.response_size_bytes)}). Preview not available.
            </p>
          )}
          <Button variant="primary" onClick={restoreHttp} className="self-start">
            Restore to new tab
          </Button>
        </div>
      )}

      {ws && (
        <div className="flex flex-col gap-3">
          <p className="break-all text-xs text-ink-2">{ws.session.url}</p>
          <div className="text-xs text-ink-3">
            Connected {new Date(ws.session.connected_at).toLocaleString()}
            {ws.session.disconnected_at && ` — disconnected ${new Date(ws.session.disconnected_at).toLocaleString()}`}
          </div>
          {ws.session.error_message && <p className="text-xs text-red-400">{ws.session.error_message}</p>}
          <div className="max-h-72 overflow-y-auto rounded-md border border-line bg-base p-2">
            {ws.messages.map((m) => (
              <div key={m.id} className="mb-1.5 flex items-start gap-2 text-xs">
                {m.direction === "sent" ? (
                  <ArrowUp size={12} className="mt-0.5 shrink-0 text-violet-400" />
                ) : (
                  <ArrowDown size={12} className="mt-0.5 shrink-0 text-sky-400" />
                )}
                <span className="shrink-0 text-ink-3">{new Date(m.occurred_at).toLocaleTimeString()}</span>
                <pre className="whitespace-pre-wrap break-all font-mono text-ink">
                  {m.payload_encoding === "text" ? m.payload : `<${m.message_type} ${m.size_bytes}B>`}
                </pre>
              </div>
            ))}
          </div>
          <Button variant="primary" onClick={restoreWs} className="self-start">
            Restore to new tab
          </Button>
        </div>
      )}
    </Modal>
  );
}
