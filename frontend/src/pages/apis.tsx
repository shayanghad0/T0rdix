import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Trash2, Waypoints, Zap } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, EnvBadge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CodeEditor } from "@/components/ui/code-editor";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import type { ApiEndpoint, ErrorMode, HttpMethod, MockApi } from "@/types";
import { cn } from "@/lib/utils";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const EMPTY_ENDPOINT: ApiEndpoint = {
  id: "",
  method: "GET",
  path: "/",
  statusCode: 200,
  delayMs: 0,
  description: "",
  headers: {},
  responseBody: JSON.stringify({ data: { ok: true } }, null, 2),
  errorMode: "none",
  errorStatus: 500,
  enabled: true,
  createdAt: "",
  updatedAt: "",
};

/** API Mock Studio — manage mock APIs and their endpoints. */
export function ApisPage() {
  const activeProjectId = useUiStore((state) => state.activeProjectId);

  const [apis, setApis] = useState<MockApi[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [apiForm, setApiForm] = useState({ name: "", description: "" });

  const [editor, setEditor] = useState<{ endpoint: ApiEndpoint; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeProjectId) {
      setApis([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<MockApi[]>(`/projects/${activeProjectId}/apis`);
      setApis(data);
      setSelectedApiId((current) => (current && data.some((item) => item.id === current) ? current : data[0]?.id ?? null));
    } catch (cause) {
      toast.error("Failed to load APIs", cause instanceof Error ? cause.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={Waypoints}
        title="No project selected"
        description="Choose a project from the switcher to design its mock APIs."
      />
    );
  }
  if (loading) return <PageLoader label="Loading mock APIs" />;

  const selectedApi = apis.find((api) => api.id === selectedApiId) ?? null;
  const mockBase = `${window.location.origin}/api/mock/${activeProjectId}`;

  const createApi = async () => {
    setBusy(true);
    try {
      const created = await api.post<MockApi>(`/projects/${activeProjectId}/apis`, apiForm);
      await refresh();
      setSelectedApiId(created.id);
      setApiModalOpen(false);
      setApiForm({ name: "", description: "" });
      toast.success("Mock API created", created.name);
    } catch (cause) {
      toast.error("Could not create API", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const deleteApi = async (target: MockApi) => {
    try {
      await api.delete(`/apis/${target.id}`);
      await refresh();
      toast.success("API deleted", target.name);
    } catch (cause) {
      toast.error("Delete failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  const saveEndpoint = async () => {
    if (!editor || !selectedApi) return;
    const { endpoint, isNew } = editor;
    setBusy(true);
    try {
      const payload = {
        method: endpoint.method,
        path: endpoint.path,
        statusCode: endpoint.statusCode,
        delayMs: endpoint.delayMs,
        description: endpoint.description,
        responseBody: endpoint.responseBody,
        errorMode: endpoint.errorMode,
        errorStatus: endpoint.errorStatus,
        enabled: endpoint.enabled,
      };
      if (isNew) {
        await api.post(`/apis/${selectedApi.id}/endpoints`, payload);
      } else {
        await api.patch(`/endpoints/${endpoint.id}`, payload);
      }
      await refresh();
      setEditor(null);
      toast.success(isNew ? "Endpoint added" : "Endpoint updated", `${endpoint.method} ${endpoint.path}`);
    } catch (cause) {
      toast.error("Save failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const deleteEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      await api.delete(`/endpoints/${endpoint.id}`);
      await refresh();
      toast.success("Endpoint removed");
    } catch (cause) {
      toast.error("Delete failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Mock Studio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">API Mock Studio</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            Serve live fake endpoints at
            <button
              onClick={() => {
                void navigator.clipboard.writeText(mockBase);
                toast.success("Base URL copied", mockBase);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-line/70 bg-surface-2/60 px-2 py-0.5 font-mono text-xs text-accent hover:bg-surface-2"
              title="Copy base URL"
            >
              {mockBase} <Copy className="h-3 w-3" />
            </button>
          </p>
        </div>
        <Button onClick={() => setApiModalOpen(true)}><Plus className="h-4 w-4" /> New mock API</Button>
      </header>

      {apis.length === 0 ? (
        <EmptyState
          icon={Waypoints}
          title="No mock APIs yet"
          description="Create your first mock API, then add endpoints like GET /users with custom responses, delays and error simulation."
          action={<Button onClick={() => setApiModalOpen(true)}><Plus className="h-4 w-4" /> Create mock API</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* API list */}
          <div className="space-y-2">
            {apis.map((api) => (
              <SpotlightCard
                key={api.id}
                glow={api.id === selectedApiId ? "var(--c-primary)" : "transparent"}
                className={cn("p-4", api.id === selectedApiId && "border-primary/40")}
              >
                <button onClick={() => setSelectedApiId(api.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-content">{api.name}</h3>
                    <Badge>{api.endpoints.length} ep</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{api.description || "No description"}</p>
                </button>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${api.name}`} onClick={() => void deleteApi(api)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Endpoints of selected API */}
          <SpotlightCard className="p-5">
            {selectedApi ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-content">{selectedApi.name}</h2>
                    <p className="text-xs text-muted">{selectedApi.endpoints.length} endpoints</p>
                  </div>
                  <Button size="sm" onClick={() => setEditor({ endpoint: { ...EMPTY_ENDPOINT }, isNew: true })}>
                    <Plus className="h-3.5 w-3.5" /> Add endpoint
                  </Button>
                </div>

                {selectedApi.endpoints.length === 0 ? (
                  <p className="py-10 text-center text-xs text-faint">No endpoints yet — add GET /users to begin.</p>
                ) : (
                  <ul className="divide-y divide-line/50">
                    {selectedApi.endpoints.map((endpoint) => (
                      <li key={endpoint.id} className="flex flex-wrap items-center gap-3 py-3">
                        <MethodBadge method={endpoint.method} />
                        <button
                          className="flex-1 truncate text-left font-mono text-xs text-content hover:text-primary"
                          onClick={() => {
                            void navigator.clipboard.writeText(`${mockBase}${endpoint.path.replace(/:(\w+)/g, "1")}`);
                            toast.success("URL copied", `${mockBase}${endpoint.path.replace(/:(\w+)/g, "1")}`);
                          }}
                          title="Click to copy a callable URL"
                        >
                          {endpoint.path}
                        </button>
                        {endpoint.delayMs > 0 ? <Badge variant="warning">{endpoint.delayMs}ms</Badge> : null}
                        {endpoint.errorMode !== "none" ? <Badge variant="danger">err:{endpoint.errorMode}</Badge> : null}
                        <Badge variant={endpoint.enabled ? "success" : "default"}>{endpoint.statusCode}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Edit endpoint" onClick={() => setEditor({ endpoint: { ...endpoint }, isNew: false })}>
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Delete endpoint" onClick={() => void deleteEndpoint(endpoint)}>
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 rounded-xl border border-line/60 bg-surface-2/40 p-3">
                  <p className="text-[11px] text-faint">
                    Try it live:
                    <code className="ml-2 font-mono text-accent">curl {mockBase}{selectedApi.endpoints[0]?.path.replace(/:(\w+)/g, "1") ?? "/…"}</code>
                  </p>
                </div>
              </>
            ) : null}
          </SpotlightCard>
        </div>
      )}

      {/* New API modal */}
      <Modal
        open={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        title="New mock API"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApiModalOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void createApi()}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input autoFocus placeholder="Users API" value={apiForm.name} onChange={(event) => setApiForm({ ...apiForm, name: event.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea placeholder="What does this fake service expose?" value={apiForm.description} onChange={(event) => setApiForm({ ...apiForm, description: event.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Endpoint editor */}
      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.isNew ? "New endpoint" : "Edit endpoint"}
        description="Relative path under the project gateway. Use :param segments for wildcards."
        width="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button loading={busy} onClick={() => void saveEndpoint()}>Save endpoint</Button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[110px_1fr_90px] gap-2">
              <Field label="Method">
                <Select
                  value={editor.endpoint.method}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, method: event.target.value as HttpMethod } })}
                >
                  {METHODS.map((method) => <option key={method}>{method}</option>)}
                </Select>
              </Field>
              <Field label="Path">
                <Input
                  className="font-mono"
                  placeholder="/users/:id"
                  value={editor.endpoint.path}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, path: event.target.value } })}
                />
              </Field>
              <Field label="Status">
                <Input
                  type="number"
                  min={100}
                  max={599}
                  value={editor.endpoint.statusCode}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, statusCode: Number(event.target.value) || 200 } })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Delay (ms)">
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={editor.endpoint.delayMs}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, delayMs: Math.max(0, Number(event.target.value) || 0) } })}
                />
              </Field>
              <Field label="Error simulation">
                <Select
                  value={editor.endpoint.errorMode}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, errorMode: event.target.value as ErrorMode } })}
                >
                  <option value="none">none</option>
                  <option value="random">random (≈30%)</option>
                  <option value="always">always</option>
                </Select>
              </Field>
              <Field label="Error status">
                <Input
                  type="number"
                  min={100}
                  max={599}
                  value={editor.endpoint.errorStatus}
                  onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, errorStatus: Number(event.target.value) || 500 } })}
                />
              </Field>
            </div>

            <Field label="Description">
              <Input
                placeholder="List all users"
                value={editor.endpoint.description}
                onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, description: event.target.value } })}
              />
            </Field>

            <Field label="Response body">
              <CodeEditor
                language="json"
                readOnly={false}
                height={220}
                value={editor.endpoint.responseBody}
                onChange={(value) =>
                  setEditor(editor ? { ...editor, endpoint: { ...editor.endpoint, responseBody: value ?? "" } } : editor)
                }
              />
            </Field>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={editor.endpoint.enabled}
                onChange={(event) => setEditor({ ...editor, endpoint: { ...editor.endpoint, enabled: event.target.checked } })}
                className="h-3.5 w-3.5 rounded border-line bg-surface-2 accent-[rgb(var(--c-primary))]"
              />
              Enabled (disabled endpoints return 404 from the gateway)
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
