import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Spotlight glow card — tracks the pointer and highlights the surface with a
 * configurable hue (ui-master.md directive).
 */
export function SpotlightCard({
  children,
  className,
  glow = "var(--c-primary)",
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(event) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        node.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line/70 bg-surface/70 backdrop-blur-xl",
        "transition-colors duration-300 hover:border-line",
        className,
      )}
      {...props}
    >
      {/* pointer-tracked glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            glow === "transparent"
              ? undefined
              : `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgb(${glow} / 0.14), transparent 65%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Small labeled metric tile used across the dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  glow,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  glow?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <SpotlightCard glow={glow} className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">{label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-content">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
          </div>
          {icon ? (
            <div className="rounded-xl border border-line/70 bg-surface-2 p-2.5 text-primary">{icon}</div>
          ) : null}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
