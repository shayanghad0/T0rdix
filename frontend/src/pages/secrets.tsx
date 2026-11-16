import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, History, KeyRound, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";
import { useDebouncedValue } from "@/hooks/use-theme";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, EnvBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { downloadTextFile, relativeTime } from "@/lib/utils";
import type { EnvironmentName, SecretDTO, SecretVersion } from "@/types";
import { ENVIRONMENTS } from "@/types";

const ENV_TABS: (EnvironmentName | "all")[] = ["all", ...ENVIRONMENTS];

/** Parse pasted .env text into key/value pairs for bulk import. */
function parseDotenv(text: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    pairs.push({ key: line.slice(0, eq).trim(), value });
  }
  return pairs;
}

export function SecretsPage() {
  const activeProjectId = useUiStore((state) => state.activeProjectId);

  const [secrets, setSecrets] = useState<SecretDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState<EnvironmentName | "all">("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SecretDTO | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SecretDTO | null>(null);

  const [form, setForm] = useState({ key: "", value: "", environment: "development" as EnvironmentName });
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");
  const [importEnv, setImportEnv] = useState<EnvironmentName>("development");

  const refresh = useCallback(async () => {
    if (!activeProjectId) {
      setSecrets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SecretDTO[]>(`/projects/${activeProjectId}/secrets`);
      setSecrets(data);
    } catch (cause) {
      toast.error("Failed to load secrets", cause instanceof Error ? cause.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    setRevealed({});
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      secrets
        .filter((secret) => (envFilter === "all" ? true : secret.environment === envFilter))
        .filter((secret) => secret.key.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [secrets, envFilter, debouncedSearch],
  );

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No project selected"
        description="Pick a workspace project in the top switcher (or create one) to manage its secrets."
      />
    );
  }
  if (loading) return <PageLoader label="Decrypting vault" />;

  const createSecret = async () => {
    setBusy(true);
    try {
      await api.post(`/projects/${activeProjectId}/secrets`, form);
      await refresh();
      setCreateOpen(false);
      setForm({ key: "", value: "", environment: form.environment });
      toast.success("Secret stored", `${form.key} → ${form.environment} (AES-256-GCM)`);
    } catch (cause) {
      toast.error("Could not store secret", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setBusy(true);
    try {
      await api.patch(`/secrets/${editTarget.id}`, {
        key: editTarget.key,
        environment: editTarget.environment,
        ...(revealed[editTarget.id] !== undefined ? { value: revealed[editTarget.id] } : {}),
      });
      await refresh();
      setEditTarget(null);
      toast.success("Secret updated");
    } catch (cause) {
      toast.error("Update failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (secret: SecretDTO) => {
    try {
      const { value } = await api.get<{ value: string }>(`/secrets/${secret.id}/reveal`);
      setRevealed((current) => ({ ...current, [secret.id]: value }));
      toast.info("Value revealed", "Every reveal is recorded in the audit log.");
    } catch (cause) {
      toast.error("Reveal failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  const remove = async (secret: SecretDTO) => {
    try {
      await api.delete(`/secrets/${secret.id}`);
      await refresh();
      toast.success("Secret deleted", secret.key);
    } catch (cause) {
      toast.error("Delete failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  const runImport = async () => {
    const pairs = parseDotenv(importText);
    if (pairs.length === 0) {
      toast.error("Nothing to import", "Paste lines like KEY=value.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ created: number; updated: number }>(
        `/projects/${activeProjectId}/secrets/bulk`,
        { items: pairs.map((pair) => ({ ...pair, environment: importEnv })) },
      );
      await refresh();
      setImportOpen(false);
      setImportText("");
      toast.success("Import complete", `${result.created} created · ${result.updated} updated`);
    } catch (cause) {
      toast.error("Import failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const exportEnv = async (environment: EnvironmentName) => {
    const pairs: { key: string; value: string }[] = [];
    for (const secret of secrets.filter((candidate) => candidate.environment === environment)) {
      try {
        const { value } = await api.get<{ value: string }>(`/secrets/${secret.id}/reveal`);
        pairs.push({ key: secret.key, value });
      } catch {
        /* skip undecryptable */
      }
    }
    downloadTextFile(
      `.env.${environment}`,
      pairs.map((pair) => `${pair.key}=${pair.value}`).join("\n") + "\n",
    );
    toast.success(`Exported .env.${environment}`, `${pairs.length} keys`);
  };

  const columns: Column<SecretDTO>[] = [
    {
      key: "key",
      header: "Key",
      render: (secret) => <code className="font-mono text-xs text-content">{secret.key}</code>,
    },
    {
      key: "env",
      header: "Environment",
      render: (secret) => <EnvBadge environment={secret.environment} />,
    },
    {
      key: "value",
      header: "Value",
      render: (secret) => {
        const value = revealed[secret.id];
        return (
          <div className="flex items-center gap-2">
            <code className="max-w-52 truncate font-mono text-xs text-muted">
              {value !== undefined ? value : "••••••••••••••••"}
            </code>
            {value !== undefined ? (
              <Button variant="ghost" size="icon-sm" aria-label="Hide value" onClick={() => setRevealed(({ [secret.id]: _omit, ...rest }) => rest)}>
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label="Reveal value" onClick={() => void reveal(secret)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "version",
      header: "Version",
      render: (secret) => (
        <button
          onClick={() => setHistoryTarget(secret)}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary"
        >
          <History className="h-3 w-3" /> v{secret.versionsCount}
        </button>
      ),
    },
    { key: "updated", header: "Updated", render: (secret) => <span className="text-xs text-faint">{relativeTime(secret.updatedAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (secret) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditTarget(secret)}>
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void remove(secret)}>
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Vault</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Secret Manager</h1>
          <p className="mt-1 text-sm text-muted">AES-256-GCM encrypted at rest · full version history · audit logged.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import .env</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add secret</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {ENV_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setEnvFilter(tab)}
            className={
              envFilter === tab
                ? "rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-xs font-medium text-content"
                : "rounded-full border border-line/70 px-3.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-content"
            }
          >
            {tab === "all" ? "All" : tab}
          </button>
        ))}
        <div className="flex-1" />
        {ENVIRONMENTS.map((environment) => (
          <Button key={environment} variant="ghost" size="sm" onClick={() => void exportEnv(environment)}>
            ↓ .env.{environment}
          </Button>
        ))}
      </div>

      <SpotlightCard className="p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line/70 bg-surface-2/50 px-3">
          <Search className="h-4 w-4 text-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search secret keys…"
            className="h-9 w-full bg-transparent text-sm text-content outline-none placeholder:text-faint"
          />
          <Badge>{filtered.length}</Badge>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(secret) => secret.id}
          empty={<p className="py-10 text-center text-xs text-faint">No secrets match. Add one or change filters.</p>}
        />
      </SpotlightCard>

      {/* Create secret */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add secret"
        description="Values are encrypted with AES-256-GCM before they touch disk."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void createSecret()}>Store secret</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Environment">
            <Select value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value as EnvironmentName })}>
              {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
            </Select>
          </Field>
          <Field label="Key" hint="SCREAMING_SNAKE_CASE, e.g. OPENAI_API_KEY">
            <Input
              autoFocus
              className="font-mono"
              placeholder="OPENAI_API_KEY"
              value={form.key}
              onChange={(event) => setForm({ ...form, key: event.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Value">
            <Textarea
              className="min-h-24"
              placeholder="sk-…"
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* Import .env */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import .env"
        description="Paste KEY=value lines — existing keys are updated, new ones created."
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void runImport()}>Import</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Target environment">
            <Select value={importEnv} onChange={(event) => setImportEnv(event.target.value as EnvironmentName)}>
              {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
            </Select>
          </Field>
          <Field label=".env content">
            <Textarea
              className="min-h-40"
              placeholder={"# paste your .env\nOPENAI_API_KEY=sk-…\nDATABASE_URL=postgres://…"}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
          </Field>
        </div>
      </Modal>

      {/* Edit secret */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit secret"
        description={`Saving a new value creates version v${(editTarget?.versionsCount ?? 0) + 1} automatically.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button loading={busy} onClick={() => void saveEdit()}>Save changes</Button>
          </>
        }
      >
        {editTarget ? (
          <div className="space-y-4">
            <Field label="Key">
              <Input
                className="font-mono"
                value={editTarget.key}
                onChange={(event) => setEditTarget({ ...editTarget, key: event.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Environment">
              <Select
                value={editTarget.environment}
                onChange={(event) => setEditTarget({ ...editTarget, environment: event.target.value as EnvironmentName })}
              >
                {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
              </Select>
            </Field>
            <Field label="New value" hint="Leave empty to keep the current value.">
              <Textarea
                className="min-h-24"
                placeholder={revealed[editTarget.id] !== undefined ? revealed[editTarget.id] : "•••••• (unchanged)"}
                value={revealed[editTarget.id] ?? ""}
                onChange={(event) => setRevealed({ ...revealed, [editTarget.id]: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      {/* Version history */}
      <Modal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title={`History — ${historyTarget?.key ?? ""}`}
        description="Every value change is versioned. Restore rolls back by re-saving the old value as a new version."
        width="max-w-2xl"
      >
        {historyTarget ? <VersionHistory secretId={historyTarget.id} onRestore={() => { setHistoryTarget(null); void refresh(); }} /> : null}
      </Modal>
    </div>
  );
}

function VersionHistory({ secretId, onRestore }: { secretId: string; onRestore: () => void }) {
  const [versions, setVersions] = useState<SecretVersion[] | null>(null);

  useEffect(() => {
    void api
      .get<SecretVersion[]>(`/secrets/${secretId}/versions`)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [secretId]);

  const restore = async (version: number) => {
    try {
      await api.post(`/secrets/${secretId}/versions/${version}/restore`);
      toast.success(`Restored v${version}`, "A new version was created with the old value.");
      onRestore();
    } catch (cause) {
      toast.error("Restore failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  if (!versions) return <p className="py-6 text-center text-xs text-faint">Decrypting history…</p>;

  return (
    <ul className="divide-y divide-line/50">
      {versions
        .slice()
        .reverse()
        .map((version) => (
          <li key={version.version} className="flex items-center gap-3 py-3">
            <Badge variant={version.version === versions.length ? "primary" : "default"}>v{version.version}</Badge>
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-content">{version.value ?? "🔒 undecryptable"}</code>
            <span className="shrink-0 text-[11px] text-faint">{relativeTime(version.changedAt)}</span>
            <Button variant="ghost" size="icon-sm" aria-label={`Restore v${version.version}`} onClick={() => void restore(version.version)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
    </ul>
  );
}
