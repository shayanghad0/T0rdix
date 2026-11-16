import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/** Pill-style animated theme switch (ui-master.md `theme-toggle`). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className={cn(
        "flex h-8 w-16 cursor-pointer items-center rounded-full border p-1 transition-all duration-300",
        isDark ? "border-line bg-surface-2" : "border-line bg-surface-3",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300",
          isDark ? "translate-x-0 bg-surface-3" : "translate-x-8 bg-surface",
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5 text-content" /> : <Sun className="h-3.5 w-3.5 text-warning" />}
      </span>
    </button>
  );
}
