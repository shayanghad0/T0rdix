import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Boxes,
  Database,
  GitBranch,
  KeyRound,
  Plus,
  Sparkles,
  Terminal,
  Waypoints,
} from "lucide-react";
import { useProjects, useProjectOverview } from "@/hooks/use-projects";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard, StatCard } from "@/components/ui/spotlight-card";
import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/utils";

/** Landing dashboard for the active workspace. */
export function DashboardPage() {
  const { projects, loading } = useProjects();
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const setActiveProject = useUiStore((state) => state.setActiveProject);

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProject(projects[0].id);
    }
  }, [activeProjectId, projects, setActiveProject]);

  const { overview, loading: overviewLoading } = useProjectOverview(activeProjectId);

  if (loading || overviewLoading) return <PageLoader label="Preparing workspace" />;

  if (!overview) {
    return (
      <EmptyState
        icon={Boxes}
        title="No project selected"
        description="Create your first project to unlock the secret manager, mock studio and API testing."
        action={
          <Link to="/projects">
            <Button><Plus className="h-4 w-4" /> Go to projects</Button>
          </Link>
        }
      />
    );
  }

  const { project, stats, endpointPreview } = overview;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">{project.description || "No description yet."}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/mock"><Button variant="subtle" size="sm"><Database className="h-3.5 w-3.5" /> Mock gateway</Button></Link>
          <Link to="/settings"><Button variant="subtle" size="sm"><Terminal className="h-3.5 w-3.5" /> CLI setup</Button></Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Secrets" value={stats.secretCount} hint={stats.environments.join(" · ") || "no environments"} icon={<KeyRound className="h-4 w-4" />} />
        <StatCard label="Endpoints" value={stats.endpointCount} hint={`across ${stats.apiCount} mock API${stats.apiCount === 1 ? "" : "s"}`} icon={<Waypoints className="h-4 w-4" />} glow="var(--c-accent)" />
        <StatCard label="Saved requests" value={stats.requestCount} hint={`in ${stats.collectionCount} collection${stats.collectionCount === 1 ? "" : "s"}`} icon={<GitBranch className="h-4 w-4" />} glow="var(--c-success)" />
        <StatCard label="Mock calls 24h" value={stats.apiCalls24h} hint={`log entries: ${stats.logCount}`} icon={<Activity className="h-4 w-4" />} glow="var(--c-warning)" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">Endpoint preview</h2>
            <Link to="/apis" className="text-xs text-primary hover:underline">API studio →</Link>
          </div>
          {endpointPreview.length === 0 ? (
            <p className="py-8 text-center text-xs text-faint">
              No endpoints yet — create a mock API or import an OpenAPI spec.
            </p>
          ) : (
            <ul className="divide-y divide-line/50">
              {endpointPreview.map((endpoint) => (
                <li key={endpoint.id} className="flex items-center gap-3 py-2.5">
                  <MethodBadge method={endpoint.method} />
                  <code className="flex-1 truncate font-mono text-xs text-content">{endpoint.path}</code>
                  <Badge variant={endpoint.enabled ? "success" : "default"}>
                    {endpoint.statusCode}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SpotlightCard>

        <div className="space-y-4">
          <SpotlightCard glow="var(--c-accent)" className="p-6">
            <Sparkles className="mb-3 h-5 w-5 text-accent" />
            <h2 className="text-sm font-semibold text-content">Fake data studio</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Generate reproducible users, products, orders, companies and addresses — seeded for deterministic output.
            </p>
            <Link to="/fake-data"><Button variant="subtle" size="sm" className="mt-4">Open generator</Button></Link>
          </SpotlightCard>

          <SpotlightCard glow="var(--c-success)" className="p-6">
            <h2 className="text-sm font-semibold text-content">Members</h2>
            <ul className="mt-3 space-y-2">
              {overview.members.slice(0, 4).map((member) => (
                <li key={member.userId} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-bold text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-content">{member.name}</span>
                  <Badge variant={member.role === "ADMIN" ? "primary" : "default"}>{member.role}</Badge>
                </li>
              ))}
            </ul>
            <Link to={`/projects/${project.id}`} className="mt-4 inline-block text-xs text-primary hover:underline">
              Manage team →
            </Link>
          </SpotlightCard>
        </div>
      </section>

      <p className="text-center text-[11px] text-faint">
        Project updated {relativeTime(project.updatedAt)}
      </p>
    </div>
  );
}
