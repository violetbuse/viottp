import { useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Radio, MoreVertical, Copy, Trash2 } from "lucide-react";
import { useSavedRequestsStore } from "../../stores/saved-requests-store";
import { useTabsStore } from "../../stores/tabs-store";
import type { SavedRequest } from "../../lib/types";

const methodColors: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-amber-400",
  PUT: "text-sky-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
};

export function SavedRequestsList() {
  const { items, refresh, create, remove } = useSavedRequestsStore();
  const openSavedRequest = useTabsStore((s) => s.openSavedRequest);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function duplicate(req: SavedRequest) {
    await create({
      kind: req.kind,
      name: `${req.name} copy`,
      method: req.method,
      url: req.url,
      headers: req.headers,
      query_params: req.query_params,
      body: req.body,
      body_type: req.body_type,
      ws_init_message: req.ws_init_message,
    });
  }

  if (items.length === 0) {
    return (
      <p className="p-4 text-center text-xs text-ink-3">
        No saved requests yet. Build one and hit the save icon on its tab.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((req) => (
        <div
          key={req.id}
          onClick={() => openSavedRequest(req)}
          className="group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-violet-600/10"
        >
          {req.kind === "ws" ? (
            <Radio size={12} className="shrink-0 text-ink-3" />
          ) : (
            <span className={`w-9 shrink-0 text-[10px] font-bold ${methodColors[req.method ?? ""] ?? "text-ink-2"}`}>
              {req.method}
            </span>
          )}
          <span className="flex-1 truncate text-ink-2">{req.name}</span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-violet-300"
              >
                <MoreVertical size={13} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[160px] rounded-md border border-line-2 bg-panel p-1 shadow-xl"
                sideOffset={4}
              >
                <DropdownMenu.Item
                  onSelect={() => duplicate(req)}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-sm text-ink outline-none hover:bg-violet-600/20"
                >
                  <Copy size={13} /> Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => remove(req.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-sm text-red-400 outline-none hover:bg-red-950/50"
                >
                  <Trash2 size={13} /> Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ))}
    </div>
  );
}
