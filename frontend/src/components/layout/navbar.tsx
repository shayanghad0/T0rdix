import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, LogOut, Plus, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { useProjects } from "@/hooks/use-projects";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api } from "@/services/api";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

/**
 * Workspace switcher in the navbar — select the active project + quick create.
 * Exported because the app shell renders it inside its header.
 */
export function ProjectSwitcher() {
  const { projects, refresh } = useProjects();
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const setActiveProject = useUiStore((state) => state.setActiveProject);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const ref = useOutsideClose(() => setOpen(false));
  const active = projects.find((project) => project.id === activeProjectId) ?? null;

  // Strip leading whitespace/keeps names tidy
  const submit = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Name too short", "Project names need at least 2 characters.");
      return;
    }
    setCreating(true);
    try {
      const project = await api.post<Project>("/projects", form);
      await refresh();
      setActiveProject(project.id);
      setCreateOpen(false);
      setForm({ name: "", description: "" });
      toast.success("Project created", project.name);
      navigate(`/projects/${project.id}`);
    } catch (cause) {
      toast.error("Could not create project", cause instanceof Error ? cause.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 max-w-64 items-center gap-2 rounded-lg border border-line/70 bg-surface/60 px-3 text-sm text-content transition-colors hover:bg-surface-2"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/20 text-[9px] font-bold text-primary">
          {active ? active.name.charAt(0).toUpperCase() : "?"}
        </span>
        <span className="truncate">{active ? active.name : "Select project"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
      </button>

      {open ? (
        <div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-line/80 bg-surface/95 p-1.5 shadow-card backdrop-blur-xl">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">Workspace</p>
          {projects.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted">No projects yet — create one.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setActiveProject(project.id);
                    setOpen(false);
                    navigate(`/projects/${project.id}`);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    project.id === activeProjectId ? "bg-primary/10 text-content" : "text-muted hover:bg-surface-2 hover:text-content",
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  {project.id === activeProjectId ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              ))}
            </div>
          )}
          <div className="my-1 border-t border-line/60" />
          <button
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" /> New project
          </button>
        </div>
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        description="A project groups secrets, mock APIs, collections and logs."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={creating} onClick={() => void submit()}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Project name">
            <Input
              autoFocus
              placeholder="My SaaS API"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Description" hint="Optional — shown on the project card.">
            <Textarea
              placeholder="What lives in this workspace?"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/** Right side of the navbar: user menu with sign-out. */
export function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white"
        aria-label="Account menu"
      >
        {user.name.charAt(0).toUpperCase()}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-line/80 bg-surface/95 p-1.5 shadow-card backdrop-blur-xl">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-content">{user.name}</p>
            <p className="truncate text-xs text-faint">{user.email}</p>
          </div>
          <div className="my-1 border-t border-line/60" />
          <button
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-content"
          >
            <User className="h-4 w-4" /> Profile & tokens
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
