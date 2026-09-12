import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  className = "",
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" | "danger" }) {
  const variants: Record<string, string> = {
    default: "bg-panel-2 hover:bg-panel-3 text-ink border border-line-2",
    primary: "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.4)]",
    ghost: "hover:bg-panel-3 text-ink-2",
    danger: "bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-900/70",
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  className = "",
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            aria-label={label}
            className={`inline-flex items-center justify-center rounded-md p-1.5 text-ink-3 hover:bg-panel-3 hover:text-violet-300 transition-colors ${className}`}
            {...props}
          >
            {children}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded bg-panel-3 border border-line-2 px-2 py-1 text-xs text-ink shadow-lg shadow-black/50"
            sideOffset={6}
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  width = "480px",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-2 bg-panel p-5 shadow-2xl shadow-black/80 max-h-[85vh] overflow-y-auto"
          style={{ width, boxShadow: "0 0 0 1px rgba(139,92,246,0.08), 0 25px 50px -12px rgba(0,0,0,0.8)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-ink-3 hover:text-violet-300">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-line-2 bg-panel-2 px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md border border-line-2 bg-panel-2 px-2 py-1.5 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 ${props.className ?? ""}`}
    />
  );
}
