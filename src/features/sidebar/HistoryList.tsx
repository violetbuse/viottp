import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "../../components/ui";
import { useHistoryStore } from "../../stores/history-store";
import { formatDuration, formatRelativeTime, statusColorClass } from "../../lib/format";
import { HistoryDetail } from "../history/HistoryDetail";

const methodColors: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-amber-400",
  PUT: "text-sky-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
};

export function HistoryList() {
  const [tab, setTab] = useState<"http" | "ws">("http");
  const {
    httpItems,
    wsItems,
    search,
    setSearch,
    refreshHttp,
    refreshWs,
    removeHttp,
    clearHttp,
    clearWs,
  } = useHistoryStore();
  const [selectedHttp, setSelectedHttp] = useState<string | null>(null);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);

  useEffect(() => {
    refreshHttp();
  }, [refreshHttp, search]);

  useEffect(() => {
    refreshWs();
  }, [refreshWs]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-2 pt-2">
        {(["http", "ws"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              tab === t ? "bg-violet-600/20 text-violet-200" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t === "http" ? "HTTP" : "WebSocket"}
          </button>
        ))}
        <button
          onClick={() => (tab === "http" ? clearHttp() : clearWs())}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] text-ink-3 hover:text-red-400"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {tab === "http" && (
        <div className="px-2 py-1.5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by URL…"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {tab === "http" &&
          httpItems.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedHttp(h.id)}
              className="group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-violet-600/10"
            >
              <span className={`w-9 shrink-0 font-bold ${methodColors[h.method] ?? "text-ink-2"}`}>
                {h.method}
              </span>
              <span className={`w-8 shrink-0 font-semibold ${statusColorClass(h.status_code)}`}>
                {h.status_code ?? "ERR"}
              </span>
              <span className="flex-1 truncate text-ink-2">{h.url}</span>
              <span className="shrink-0 text-ink-3">{formatRelativeTime(h.sent_at)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeHttp(h.id);
                }}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        {tab === "http" && httpItems.length === 0 && (
          <p className="p-4 text-center text-xs text-ink-3">No requests sent yet.</p>
        )}

        {tab === "ws" &&
          wsItems.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedWs(s.id)}
              className="flex cursor-pointer flex-col gap-0.5 px-3 py-1.5 text-xs hover:bg-violet-600/10"
            >
              <span className="truncate text-ink-2">{s.url}</span>
              <span className="text-ink-3">
                {s.message_count} msg · {formatRelativeTime(s.connected_at)}
                {s.error_message ? " · error" : s.disconnected_at ? " · closed" : " · open"}
                {s.disconnected_at &&
                  ` · ${formatDuration(new Date(s.disconnected_at).getTime() - new Date(s.connected_at).getTime())}`}
              </span>
            </div>
          ))}
        {tab === "ws" && wsItems.length === 0 && (
          <p className="p-4 text-center text-xs text-ink-3">No WebSocket sessions yet.</p>
        )}
      </div>

      <HistoryDetail
        httpId={selectedHttp}
        wsId={selectedWs}
        onClose={() => {
          setSelectedHttp(null);
          setSelectedWs(null);
        }}
      />
    </div>
  );
}
