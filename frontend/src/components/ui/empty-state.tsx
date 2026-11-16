import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

/** Friendly empty state with a primary action slot. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="dot-grid flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/80 px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl border border-line/70 bg-surface-2/70 p-3.5">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-content">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Centered page loader. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="animate-pulse-soft text-xs">{label}…</span>
    </div>
  );
}

export { Button };
