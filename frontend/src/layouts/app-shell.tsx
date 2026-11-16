import { motion } from "framer-motion";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  Boxes,
  Database,
  FileJson,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Palette,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { ProjectSwitcher, UserMenu } from "@/components/layout/navbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof KeyRound;
  /** Shown when a project is active (workspace-scoped pages). */
  needsProject?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: Boxes },
  { to: "/secrets", label: "Secrets", icon: KeyRound, needsProject: true },
  { to: "/apis", label: "APIs", icon: Waypoints, needsProject: true },
  { to: "/mock", label: "Mock Studio", icon: Database, needsProject: true },
  { to: "/testing", label: "Testing", icon: FlaskConical, needsProject: true },
  { to: "/fake-data", label: "Fake Data", icon: Sparkles },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/**
 * Expanding tab strip (ui-master.md): collapses to icons; expands the active /
 * hovered tab in place; collapses again on outside click.
 */
function ExpandingTabs() {
  const expanded = useUiStore((state) => state.sidebarExpanded);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!expanded) return;
    const handler = (event: MouseEvent) => {
      // Collapse when clicking outside the rail (ui-master: click-outside collapse).
      const rail = document.getElementById("t0rdix-rail");
      if (rail && !rail.contains(event.target as Node)) {
        useUiStore.getState().toggleSidebar();
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [expanded]);

  const items = NAV.filter((item) => !item.needsProject || activeProjectId);

  return (
    <nav className="mt-6 flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
      {items.map((item) => {
        const active = location.pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <button
            key={item.to}
            onClick={(event) => {
              event.stopPropagation();
              navigate(item.to);
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-300",
              active ? "bg-primary/12 text-content" : "text-muted hover:bg-surface-2 hover:text-content",
            )}
          >
            {active ? (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              />
            ) : null}
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                expanded ? "w-auto opacity-100" : "w-0 opacity-0",
              )}
            >
              {item.label}
            </span>
            {!expanded ? (
              <span
                className={cn(
                  "pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md border border-line/80",
                  "bg-surface px-2 py-1 text-xs text-content shadow-card group-hover:block",
                )}
              >
                {item.label}
              </span>
            ) : null}
          </button>
        );
      })}

      <button
        onClick={(event) => {
          event.stopPropagation();
          toggleSidebar();
        }}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="mt-2 flex h-9 items-center gap-3 rounded-xl px-3 text-xs text-faint transition-colors hover:bg-surface-2 hover:text-content"
      >
        <Palette className="h-4 w-4 shrink-0" />
        <span className={cn("whitespace-nowrap transition-all duration-300", expanded ? "opacity-100" : "w-0 overflow-hidden opacity-0")}>
          {expanded ? "Collapse" : ""}
        </span>
      </button>
    </nav>
  );
}

function SidebarFooter() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();
  return (
    <div className="border-t border-line/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-content">{user.name}</p>
          <p className="truncate text-[11px] text-faint">{user.role}</p>
        </div>
      </div>
    </div>
  );
}

/** Authenticated shell: expanding tab rail, navbar, content, toaster, palette. */
export function AppShell() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const expanded = useUiStore((state) => state.sidebarExpanded);
  const location = useLocation();
  useGlobalShortcuts();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex h-full">
      <aside
        id="t0rdix-rail"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line/60 bg-surface/60 backdrop-blur-xl transition-[width] duration-300",
          expanded ? "w-[68px] md:w-[232px]" : "w-[68px]",
        )}
      >
        <div className="top-glow flex items-center gap-2.5 px-5 pb-2 pt-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent font-mono text-sm font-bold text-white">
            T
          </div>
          <div className={cn("overflow-hidden transition-opacity", expanded ? "opacity-100" : "hidden opacity-0")}>
            <p className="truncate font-mono text-sm font-bold tracking-tight text-content">T0rdix</p>
            <p className="truncate text-[10px] text-faint">developer workspace</p>
          </div>
        </div>
        <ExpandingTabs />
        <SidebarFooter />
      </aside>

      <div className={cn("flex min-h-full flex-1 flex-col transition-[margin] duration-300", expanded ? "ml-[68px] md:ml-[232px]" : "ml-[68px]")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <ProjectSwitcher />
          <div className="flex-1" />
          <button
            onClick={() => useUiStore.getState().setCommandOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-lg border border-line/70 bg-surface/60 px-3 text-xs text-faint transition-colors hover:text-content sm:flex"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>Jump to…</span>
            <span className="kbd ml-2">⌘K</span>
          </button>
          <ThemeToggle />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-line/40 px-6 py-3 text-center text-[11px] text-faint">
          T0rdix · local-first developer workspace · MIT licensed
        </footer>
      </div>

      <CommandPalette />
      <Toaster />
    </div>
  );
}
