import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-line bg-surface-2 text-muted",
        primary: "border-primary/30 bg-primary/10 text-primary",
        accent: "border-accent/30 bg-accent/10 text-accent",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-danger/30 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Colored HTTP-method chip (GET/POST/…). */
export function MethodBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    GET: "text-sky-400 border-sky-400/25 bg-sky-400/10",
    POST: "text-emerald-400 border-emerald-400/25 bg-emerald-400/10",
    PUT: "text-amber-400 border-amber-400/25 bg-amber-400/10",
    PATCH: "text-violet-400 border-violet-400/25 bg-violet-400/10",
    DELETE: "text-rose-400 border-rose-400/25 bg-rose-400/10",
  };
  return (
    <span
      className={cn(
        "method-chip border",
        map[method.toUpperCase()] ?? "text-muted border-line bg-surface-2",
      )}
    >
      {method.toUpperCase()}
    </span>
  );
}

/** Environment chip with per-env hue. */
export function EnvBadge({ environment }: { environment: string }) {
  const map: Record<string, string> = {
    development: "text-sky-300 border-sky-400/25 bg-sky-400/10",
    staging: "text-amber-300 border-amber-400/25 bg-amber-400/10",
    production: "text-rose-300 border-rose-400/25 bg-rose-400/10",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", map[environment] ?? "border-line bg-surface-2 text-muted")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {environment}
    </span>
  );
}
