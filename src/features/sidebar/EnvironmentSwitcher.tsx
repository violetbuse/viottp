import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Plus, Settings2, Pencil, Trash2 } from "lucide-react";
import { useEnvironmentsStore } from "../../stores/environments-store";
import { IconButton } from "../../components/ui";

export function EnvironmentSwitcher({ onManageVariables }: { onManageVariables: () => void }) {
  const { environments, activeEnvironmentId, refresh, create, rename, remove, setActive } =
    useEnvironmentsStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    refresh().then(() => setLoaded(true));
  }, [refresh]);

  const active = environments.find((e) => e.id === activeEnvironmentId);

  async function handleCreate() {
    const name = window.prompt("Environment name:");
    if (!name) return;
    const env = await create(name);
    await setActive(env.id);
  }

  async function handleRename(id: string, currentName: string) {
    const name = window.prompt("Rename environment:", currentName);
    if (!name) return;
    await rename(id, name);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this environment and its variables?")) return;
    await remove(id);
  }

  if (!loaded) return <div className="h-8" />;

  return (
    <div className="flex items-center gap-1 p-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex flex-1 items-center justify-between rounded-md border border-line-2 bg-panel-2 px-2.5 py-1.5 text-sm text-ink hover:border-violet-600/60">
            <span className="truncate">{active ? active.name : "No environment"}</span>
            <ChevronDown size={14} className="shrink-0 text-ink-3" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[220px] rounded-md border border-line-2 bg-panel-3 p-1 shadow-xl shadow-black/60"
            sideOffset={4}
          >
            <DropdownMenu.Item
              onSelect={() => setActive(null)}
              className="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm text-ink-2 outline-none hover:bg-violet-600/20 hover:text-ink"
            >
              No environment (globals only)
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line-2" />
            {environments.map((env) => (
              <DropdownMenu.Item
                key={env.id}
                onSelect={() => setActive(env.id)}
                className="group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm text-ink outline-none hover:bg-violet-600/20"
              >
                <span className="truncate">{env.name}</span>
                <span className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100">
                  <Pencil
                    size={12}
                    className="hover:text-violet-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(env.id, env.name);
                    }}
                  />
                  <Trash2
                    size={12}
                    className="hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(env.id);
                    }}
                  />
                </span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line-2" />
            <DropdownMenu.Item
              onSelect={handleCreate}
              className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-sm text-violet-300 outline-none hover:bg-violet-600/20"
            >
              <Plus size={13} /> New environment
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <IconButton label="Manage variables" onClick={onManageVariables}>
        <Settings2 size={15} />
      </IconButton>
    </div>
  );
}
