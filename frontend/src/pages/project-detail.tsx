import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, ScrollText, Trash2, UserPlus, Waypoints } from "lucide-react";
import { useProjectOverview } from "@/hooks/use-projects";
import { useUiStore } from "@/stores/ui-store";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import { SpotlightCard, StatCard } from "@/components/ui/spotlight-card";
import { Badge, EnvBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/empty-state";

/** Project detail hub: stats, members, quick links, danger zone. */
export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const setActiveProject = useUiStore((state) => state.setActiveProject);
  const { overview, loading, refresh } = useProjectOverview(id ?? null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "MEMBER" as "ADMIN" | "MEMBER" });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    if (id) setActiveProject(id);
  }, [id, setActiveProject]);

  if (loading || !overview) return <PageLoader label="Loading project" />;

  const { project, stats, members } = overview;
  const isAdmin = me?.role === "ADMIN" || project.ownerId === me?.id;

  const inviteMember = async () => {
    setBusy(true);
    try {
      await api.post(`/projects/${project.id}/members`, invite);
      await refresh();
      setInviteOpen(false);
      setInvite({ email: "", role: "MEMBER" });
      toast.success("Member added");
    } catch (cause) {
      toast.error("Could not add member", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      await refresh();
      toast.success("Member removed");
    } catch (cause) {
      toast.error("Could not remove member", cause instanceof Error ? cause.message : undefined);
    }
  };

  const deleteProject = async () => {
    setBusy(true);
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success("Project deleted", project.name);
      navigate("/projects");
    } catch (cause) {
      toast.error("Delete failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted hover:text-content">
          <ArrowLeft className="h-3 w-3" /> All projects
        </Link>
        <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content">{project.name}</h1>
            <p className="mt-1 text-sm text-muted">{project.description || "No description."}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <Button variant="subtle" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" /> Add member
              </Button>
            ) : null}
            <Link to="/secrets"><Button variant="subtle" size="sm"><KeyRound className="h-3.5 w-3.5" /> Secrets</Button></Link>
            <Link to="/apis"><Button variant="subtle" size="sm"><Waypoints className="h-3.5 w-3.5" /> APIs</Button></Link>
            <Link to="/logs"><Button variant="subtle" size="sm"><ScrollText className="h-3.5 w-3.5" /> Logs</Button></Link>
          </div>
        </header>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Secrets" value={stats.secretCount} icon={<KeyRound className="h-4 w-4" />} />
        <StatCard label="Endpoints" value={stats.endpointCount} icon={<Waypoints className="h-4 w-4" />} glow="var(--c-accent)" />
        <StatCard label="Collections" value={stats.collectionCount} icon={<ScrollText className="h-4 w-4" />} glow="var(--c-success)" />
        <StatCard label="Calls 24h" value={stats.apiCalls24h} icon={<ScrollText className="h-4 w-4" />} glow="var(--c-warning)" />
      </section>

      <SpotlightCard className="p-6">
        <h2 className="text-sm font-semibold text-content">Team</h2>
        <ul className="mt-4 divide-y divide-line/50">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                {member.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-content">{member.name}</p>
                <p className="truncate text-xs text-faint">{member.email}</p>
              </div>
              <Badge variant={member.role === "ADMIN" ? "primary" : "default"}>{member.role}</Badge>
              {isAdmin && member.userId !== project.ownerId ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${member.name}`} onClick={() => void removeMember(member.userId)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </SpotlightCard>

      <SpotlightCard className="border-danger/20 p-6">
        <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-xs text-muted">
          Deleting removes all secrets, mock APIs and collections of this project. Type the project name to confirm.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            className="h-9 w-64 rounded-lg border border-line bg-surface-2/60 px-3 text-sm text-content outline-none placeholder:text-faint"
            placeholder={project.name}
            value={confirmDelete}
            onChange={(event) => setConfirmDelete(event.target.value)}
          />
          <Button
            variant="destructive"
            loading={busy}
            disabled={confirmDelete !== project.name}
            onClick={() => void deleteProject()}
          >
            <Trash2 className="h-4 w-4" /> Delete project
          </Button>
        </div>
      </SpotlightCard>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add member"
        description="Members must already have a T0rdix account."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void inviteMember()}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email">
            <Input
              autoFocus
              type="email"
              placeholder="teammate@company.dev"
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
            />
          </Field>
          <Field label="Role" hint="ADMINs can manage members and edit everything; MEMBERs get read/write on resources.">
            <Select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as "ADMIN" | "MEMBER" })}>
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
