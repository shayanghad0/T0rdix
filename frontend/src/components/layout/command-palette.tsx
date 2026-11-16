import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Database,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
  User as UserIcon,
  Waypoints,
} from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useProjects } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof KeyRound;
  run: () => void;
  group: string;
}

/** ⌘K command palette — navigation + workspace actions. */
export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const navigate = useNavigate();
  const { projects } = useProjects();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      setOpen(false);
      navigate(path);
    };
    const list: Command[] = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, run: go("/dashboard"), group: "Navigate" },
      { id: "projects", label: "Projects", icon: Boxes, run: go("/projects"), group: "Navigate" },
      { id: "fake-data", label: "Fake Data Generator", icon: Sparkles, run: go("/fake-data"), group: "Navigate" },
      { id: "logs", label: "Activity Logs", icon: ScrollText, run: go("/logs"), group: "Navigate" },
      { id: "settings", label: "Settings", icon: SettingsIcon, run: go("/settings"), group: "Navigate" },
    ];

    if (activeProjectId) {
      list.push(
        { id: "secrets", label: "Secret Manager", icon: KeyRound, run: go("/secrets"), group: "Workspace" },
        { id: "apis", label: "API Mock Studio", icon: Waypoints, run: go("/apis"), group: "Workspace" },
        { id: "mock", label: "Mock Gateway Explorer", icon: Database, run: go("/mock"), group: "Workspace" },
        { id: "testing", label: "API Testing", icon: FlaskConical, run: go("/testing"), group: "Workspace" },
      );
    }

    for (const project of projects.slice(0, 6)) {
      list.push({
        id: `project-${project.id}`,
        label: project.name,
        hint: "Open project",
        icon: Boxes,
        run: go(`/projects/${project.id}`),
        group: "Projects",
      });
    }

    list.push({
      id: "profile",
      label: "API token & profile",
      icon: UserIcon,
      run: go("/settings"),
      group: "Account",
    });

    return list;
  }, [activeProjectId, navigate, setOpen, projects]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (command) => command.label.toLowerCase().includes(needle) || command.group.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  if (!open) return null;

  const runAt = (index: number) => {
    const command = filtered[index];
    if (!command) return;
    command.run();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[14vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-line/80 bg-surface/95 shadow-card backdrop-blur-2xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((c) => Math.min(c + 1, filtered.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            }
            if (event.key === "Enter") runAt(cursor);
          }}
          placeholder="Search commands, pages and projects…"
          className="w-full border-b border-line/70 bg-transparent px-4 py-3.5 text-sm text-content outline-none placeholder:text-faint"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-faint">No matching commands</p>
          ) : (
            filtered.map((command, index) => {
              const Icon = command.icon;
              const showGroup = index === 0 || filtered[index - 1].group !== command.group;
              return (
                <div key={command.id}>
                  {showGroup ? (
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      {command.group}
                    </p>
                  ) : null}
                  <button
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => runAt(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      index === cursor ? "bg-primary/15 text-content" : "text-muted",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", index === cursor && "text-primary")} />
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.hint ? <span className="text-[11px] text-faint">{command.hint}</span> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line/70 px-4 py-2 text-[10px] text-faint">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> select</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </motion.div>
    </div>
  );
}
