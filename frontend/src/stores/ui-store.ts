import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  /** The project currently selected in the workspace switcher. */
  activeProjectId: string | null;
  setActiveProject: (projectId: string | null) => void;
}

/** Cross-cutting UI state: palette, sidebar, active project. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),
      sidebarExpanded: true,
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      activeProjectId: null,
      setActiveProject: (activeProjectId) => set({ activeProjectId }),
    }),
    { name: "t0rdix-ui", partialize: (state) => ({ sidebarExpanded: state.sidebarExpanded, activeProjectId: state.activeProjectId }) },
  ),
);
