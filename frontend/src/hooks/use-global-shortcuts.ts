import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/ui-store";

/**
 * Global keyboard shortcuts:
 *   ⌘K / Ctrl+K  → command palette
 *   Escape       → close palette (handled in the palette itself)
 */
export function useGlobalShortcuts(): void {
  const toggleCommand = useUiStore((state) => state.toggleCommand);
  const ref = useRef(toggleCommand);
  ref.current = toggleCommand;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
