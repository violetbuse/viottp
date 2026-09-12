import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, SendHorizontal } from "lucide-react";
import { Button, Input } from "../../components/ui";
import { tryPrettyJson } from "../../lib/format";
import { useTabsStore } from "../../stores/tabs-store";
import type { TabState } from "../../stores/tabs-store";

export function WsMessageLog({ tab }: { tab: TabState }) {
  const [draft, setDraft] = useState("");
  const sendWsMessage = useTabsStore((s) => s.sendWsMessage);
  const listRef = useRef<HTMLDivElement>(null);
  const isOpen = tab.wsStatus === "open";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [tab.wsMessages.length]);

  function handleSend() {
    if (!draft.trim() || !isOpen) return;
    sendWsMessage(tab.id, draft, "text");
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        ref={listRef}
        className="flex-1 min-h-[120px] overflow-y-auto rounded-md border border-line bg-base p-2"
      >
        {tab.wsMessages.length === 0 && (
          <p className="p-4 text-center text-xs text-ink-3">
            No messages yet. Connect and send something.
          </p>
        )}
        {tab.wsMessages.map((m) => {
          const { pretty } = tryPrettyJson(m.payload_encoding === "text" ? m.payload : `<${m.message_type} ${m.size_bytes}B>`);
          return (
            <div key={m.id} className="mb-1.5 flex items-start gap-2 text-xs">
              {m.direction === "sent" ? (
                <ArrowUp size={13} className="mt-0.5 shrink-0 text-violet-400" />
              ) : (
                <ArrowDown size={13} className="mt-0.5 shrink-0 text-sky-400" />
              )}
              <span className="shrink-0 text-ink-3">
                {new Date(m.occurred_at).toLocaleTimeString()}
              </span>
              <pre className="whitespace-pre-wrap break-all font-mono text-ink">{pretty}</pre>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={isOpen ? "Type a message and press Enter…" : "Connect to send messages"}
          disabled={!isOpen}
          className="flex-1"
        />
        <Button variant="primary" onClick={handleSend} disabled={!isOpen || !draft.trim()}>
          <SendHorizontal size={14} />
        </Button>
      </div>
    </div>
  );
}
