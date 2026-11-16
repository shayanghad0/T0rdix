import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Plus, Users, Waypoints } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/utils";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import type { Project } from "@/types";

/** Project gallery — the workspace hub. */
export function ProjectsPage() {
  const { projects, loading, refresh } = useProjects();
  const setActiveProject = useUiStore((state) => state.setActiveProject);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader label="Loading projects" />;

  const create = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Name too short");
      return;
    }
    setBusy(true);
    try {
      const project = await api.post<Project>("/projects", form);
      await refresh();
      setActiveProject(project.id);
      setCreating(false);
      setForm({ name: "", description: "" });
      toast.success("Project created", project.name);
    } catch (cause) {
      toast.error("Could not create project", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Each project bundles secrets, mock APIs, collections and logs.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New project</Button>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No projects yet"
          description="Projects are T0rdix workspaces. Create one to start storing secrets and mocking APIs."
          action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create project</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} onClick={() => setActiveProject(project.id)}>
              <SpotlightCard className="h-full p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
                    <span className="font-mono text-sm font-bold text-primary">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <Badge>{relativeTime(project.updatedAt)}</Badge>
                </div>
                <h2 className="mt-4 text-sm font-semibold text-content">{project.name}</h2>
                <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted">
                  {project.description || "No description."}
                </p>
                <div className="mt-4 flex items-center gap-3 text-[11px] text-faint">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {project.members.length}</span>
                  <span className="inline-flex items-center gap-1"><Waypoints className="h-3 w-3" /> workspace</span>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-line/80 bg-surface/95 p-6 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-content">Create project</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  autoFocus
                  className="w-full rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm text-content outline-none placeholder:text-faint focus:border-primary/60"
                  placeholder="My SaaS API"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="project-desc">Description</label>
                <textarea
                  id="project-desc"
                  className="min-h-20 w-full resize-y rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm text-content outline-none placeholder:text-faint focus:border-primary/60"
                  placeholder="What lives in this workspace?"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button loading={busy} onClick={() => void create()}>Create</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
