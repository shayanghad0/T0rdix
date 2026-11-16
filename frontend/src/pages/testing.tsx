import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderPlus, Play, Plus, Save, Send, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CodeEditor } from "@/components/ui/code-editor";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Collection, CollectionRequest, ForwardedResponse, HttpMethod } from "@/types";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface DraftRequest {
  id: string | null;
  collectionId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
  auth: CollectionRequest["auth"];
}

const NEW_DRAFT: DraftRequest = {
  id: null,
  collectionId: null,
  name: "Untitled request",
  method: "GET",
  url: "",
  headers: {},
  params: {},
  body: "",
  auth: { type: "none" },
};

/** Postman-style API testing built on collections + the server-side runner. */
export function TestingPage() {
  const activeProjectId = useUiStore((state) => state.activeProjectId);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftRequest>({ ...NEW_DRAFT });
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "body" | "auth">("params");
  const [response, setResponse] = useState<ForwardedResponse | null>(null);
  const [sending, setSending] = useState(false);

  const [collectionModal, setCollectionModal] = useState(false);
  const [collectionForm, setCollectionForm] = useState({ name: "", description: "" });
  const [saveModal, setSaveModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeProjectId) {
      setCollections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCollections(await api.get<Collection[]>(`/projects/${activeProjectId}/collections`));
    } catch (cause) {
      toast.error("Failed to load collections", cause instanceof Error ? cause.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Build the final URL with query params. */
  const targetUrl = useMemo(() => {
    if (!draft.url) return "";
    try {
      const url = new URL(draft.url);
      for (const [key, value] of Object.entries(draft.params)) {
        if (key && value) url.searchParams.set(key, value);
      }
      return url.toString();
    } catch {
      return draft.url;
    }
  }, [draft.url, draft.params]);

  const send = async () => {
    if (!targetUrl) {
      toast.error("URL required", "Enter the request URL first.");
      return;
    }
    setSending(true);
    setResponse(null);
    try {
      const headers: Record<string, string> = { ...draft.headers };
      if (draft.body && draft.method !== "GET") headers["content-type"] ||= "application/json";
      if (draft.auth.type === "bearer" && draft.auth.token) headers.authorization = `Bearer ${draft.auth.token}`;
      if (draft.auth.type === "basic" && draft.auth.username !== undefined) {
        headers.authorization = `Basic ${btoa(`${draft.auth.username}:${draft.auth.password ?? ""}`)}`;
      }

      const result = await api.post<ForwardedResponse>("/run", {
        method: draft.method,
        url: targetUrl,
        headers,
        body: draft.method === "GET" ? "" : draft.body,
      });
      setResponse(result);
      toast.info(`${result.status} in ${result.timeMs}ms`, `${formatBytes(result.sizeBytes)} received`);
    } catch (cause) {
      toast.error("Request failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const createCollection = async () => {
    if (!activeProjectId) return;
    setBusy(true);
    try {
      const created = await api.post<Collection>(`/projects/${activeProjectId}/collections`, collectionForm);
      await refresh();
      setCollectionModal(false);
      setCollectionForm({ name: "", description: "" });
      toast.success("Collection created", created.name);
    } catch (cause) {
      toast.error("Create failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      if (draft.id && draft.collectionId) {
        await api.patch(`/requests/${draft.id}`, { ...draft });
      } else {
        const created = await api.post<CollectionRequest>(`/collections/${draft.collectionId}/requests`, {
          name: draft.name,
          method: draft.method,
          url: draft.url,
          headers: draft.headers,
          params: draft.params,
          body: draft.body,
          auth: draft.auth,
        });
        setDraft({ ...draft, id: created.id, collectionId: draft.collectionId });
      }
      await refresh();
      setSaveModal(false);
      toast.success("Request saved to collection");
    } catch (cause) {
      toast.error("Save failed", cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async (request: CollectionRequest, collectionId: string) => {
    try {
      await api.delete(`/requests/${request.id}`);
      await refresh();
      if (draft.id === request.id) setDraft({ ...NEW_DRAFT });
      toast.success("Request removed");
    } catch (cause) {
      toast.error("Delete failed", cause instanceof Error ? cause.message : undefined);
    }
  };

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={Send}
        title="No project selected"
        description="Choose a project to organize collections and send requests."
      />
    );
  }
  if (loading) return <PageLoader label="Loading collections" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Testing</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">API Testing</h1>
          <p className="mt-1 text-sm text-muted">Requests run through the local server — zero CORS friction.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setCollectionModal(true)}><FolderPlus className="h-4 w-4" /> New collection</Button>
          <Button
            variant="subtle"
            disabled={!draft.url}
            onClick={() => setSaveModal(true)}
          >
            <Save className="h-4 w-4" /> Save request
          </Button>
          <Button onClick={() => void send()} loading={sending} disabled={!draft.url}>
            <Play className="h-4 w-4" /> Send
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Collections sidebar */}
        <div className="space-y-3">
          {collections.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line/80 p-4 text-center text-xs text-faint">
              No collections yet.
            </p>
          ) : (
            collections.map((collection) => (
              <SpotlightCard key={collection.id} className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-content">{collection.name}</h3>
                <ul className="mt-2 space-y-1">
                  {collection.requests.map((request) => (
                    <li key={request.id} className="group flex items-center gap-2">
                      <button
                        onClick={() =>
                          setDraft({
                            id: request.id,
                            collectionId: collection.id,
                            name: request.name,
                            method: request.method,
                            url: request.url,
                            headers: request.headers,
                            params: request.params,
                            body: request.body,
                            auth: request.auth,
                          })
                        }
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-2",
                          draft.id === request.id && "bg-primary/10",
                        )}
                      >
                        <MethodBadge method={request.method} />
                        <span className="min-w-0 flex-1 truncate text-content">{request.name}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={`Delete ${request.name}`}
                        onClick={() => void deleteRequest(request, collection.id)}
                      >
                        <Trash2 className="h-3 w-3 text-danger" />
                      </Button>
                    </li>
                  ))}
                  {collection.requests.length === 0 ? (
                    <li className="px-2 py-1 text-[11px] text-faint">empty</li>
                  ) : null}
                </ul>
              </SpotlightCard>
            ))
          )}
        </div>

        {/* Request builder */}
        <div className="space-y-4">
          <SpotlightCard className="p-5">
            <div className="flex gap-2">
              <Select
                className="w-28"
                value={draft.method}
                onChange={(event) => setDraft({ ...draft, method: event.target.value as HttpMethod })}
              >
                {METHODS.map((method) => <option key={method}>{method}</option>)}
              </Select>
              <Input
                className="flex-1 font-mono text-xs"
                placeholder="https://api.example.com/v1/users"
                value={draft.url}
                onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              />
              <Button onClick={() => void send()} loading={sending} disabled={!draft.url}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {targetUrl && targetUrl !== draft.url ? (
              <p className="mt-2 truncate font-mono text-[11px] text-faint">→ {targetUrl}</p>
            ) : null}

            <div className="mt-4 flex gap-1 border-b border-line/60">
              {(["params", "headers", "body", "auth"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-t-lg px-4 py-2 text-xs font-medium capitalize transition-colors",
                    activeTab === tab ? "border-b-2 border-primary text-content" : "text-faint hover:text-muted",
                  )}
                >
                  {tab}
                  {tab === "params" && Object.keys(draft.params).length > 0 ? <span className="ml-1 text-primary">·{Object.keys(draft.params).length}</span> : null}
                  {tab === "headers" && Object.keys(draft.headers).length > 0 ? <span className="ml-1 text-primary">·{Object.keys(draft.headers).length}</span> : null}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {activeTab === "params" ? (
                <KeyValueEditor pairs={draft.params} onChange={(params) => setDraft({ ...draft, params })} placeholderKey="page" placeholderValue="1" />
              ) : null}
              {activeTab === "headers" ? (
                <KeyValueEditor pairs={draft.headers} onChange={(headers) => setDraft({ ...draft, headers })} placeholderKey="x-request-id" placeholderValue="…" />
              ) : null}
              {activeTab === "body" ? (
                draft.method === "GET" ? (
                  <p className="text-xs text-faint">GET requests have no body.</p>
                ) : (
                  <CodeEditor
                    language="json"
                    readOnly={false}
                    height={180}
                    value={draft.body}
                    onChange={(value) => setDraft({ ...draft, body: value ?? "" })}
                  />
                )
              ) : null}
              {activeTab === "auth" ? (
                <div className="grid max-w-md gap-3">
                  <Field label="Auth type">
                    <Select
                      value={draft.auth.type}
                      onChange={(event) => setDraft({ ...draft, auth: { ...draft.auth, type: event.target.value as CollectionRequest["auth"]["type"] } })}
                    >
                      <option value="none">none</option>
                      <option value="bearer">Bearer token</option>
                      <option value="basic">Basic</option>
                    </Select>
                  </Field>
                  {draft.auth.type === "bearer" ? (
                    <Field label="Token">
                      <Input
                        className="font-mono text-xs"
                        value={draft.auth.token ?? ""}
                        onChange={(event) => setDraft({ ...draft, auth: { ...draft.auth, token: event.target.value } })}
                      />
                    </Field>
                  ) : null}
                  {draft.auth.type === "basic" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Username">
                        <Input
                          value={draft.auth.username ?? ""}
                          onChange={(event) => setDraft({ ...draft, auth: { ...draft.auth, username: event.target.value } })}
                        />
                      </Field>
                      <Field label="Password">
                        <Input
                          type="password"
                          value={draft.auth.password ?? ""}
                          onChange={(event) => setDraft({ ...draft, auth: { ...draft.auth, password: event.target.value } })}
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </SpotlightCard>

          {/* Response viewer */}
          <SpotlightCard className="p-5">
            {response ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <Badge variant={response.status < 400 ? "success" : "danger"}>
                    {response.status} {response.statusText}
                  </Badge>
                  <span className="text-xs text-faint">{response.timeMs} ms</span>
                  <span className="text-xs text-faint">{formatBytes(response.sizeBytes)}</span>
                </div>
                <details className="mb-3 rounded-lg border border-line/60">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-muted">Response headers ({Object.keys(response.headers).length})</summary>
                  <div className="max-h-40 overflow-y-auto border-t border-line/60 px-3 py-2">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <p key={key} className="font-mono text-[11px] text-faint">
                        <span className="text-muted">{key}:</span> {value}
                      </p>
                    ))}
                  </div>
                </details>
                <CodeEditor
                  language="json"
                  height={260}
                  value={(() => {
                    try {
                      return JSON.stringify(JSON.parse(response.body), null, 2);
                    } catch {
                      return response.body || "(empty response body)";
                    }
                  })()}
                />
              </>
            ) : (
              <div className="flex h-40 items-center justify-center text-xs text-faint">
                Send a request to inspect the response here.
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>

      {/* New collection modal */}
      <Modal
        open={collectionModal}
        onClose={() => setCollectionModal(false)}
        title="New collection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCollectionModal(false)}>Cancel</Button>
            <Button loading={busy} onClick={() => void createCollection()}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input autoFocus placeholder="Smoke tests" value={collectionForm.name} onChange={(event) => setCollectionForm({ ...collectionForm, name: event.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={collectionForm.description} onChange={(event) => setCollectionForm({ ...collectionForm, description: event.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Save request modal */}
      <Modal
        open={saveModal}
        onClose={() => setSaveModal(false)}
        title={draft.id ? "Update request" : "Save request to collection"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveModal(false)}>Cancel</Button>
            <Button loading={busy} disabled={!draft.collectionId} onClick={() => void saveDraft()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Request name">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          {collections.length === 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-line/60 bg-surface-2/50 px-3 py-2 text-xs text-muted">
              You need a collection first.
              <Button size="sm" variant="subtle" onClick={() => { setSaveModal(false); setCollectionModal(true); }}>
                <Plus className="h-3 w-3" /> New collection
              </Button>
            </div>
          ) : (
            <Field label="Collection">
              <Select
                value={draft.collectionId ?? ""}
                onChange={(event) => setDraft({ ...draft, collectionId: event.target.value || null })}
              >
                <option value="">Select…</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}

/** Editable key/value rows (params & headers). */
function KeyValueEditor({
  pairs,
  onChange,
  placeholderKey,
  placeholderValue,
}: {
  pairs: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
  placeholderKey: string;
  placeholderValue: string;
}) {
  const entries = Object.entries(pairs);

  const update = (index: number, field: 0 | 1, value: string) => {
    const next = { ...pairs };
    const key = entries[index]?.[0] ?? `key-${index}`;
    const [oldKey, oldValue] = entries[index] ?? [key, ""];
    void oldValue;
    delete next[oldKey];
    if (field === 0 && value) next[value] = oldValue;
    else next[field === 0 ? oldKey : key] = field === 1 ? value : oldValue;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, value], index) => (
        <div key={`${key}-${index}`} className="flex gap-2">
          <Input
            className="font-mono text-xs"
            placeholder={placeholderKey}
            value={key}
            onChange={(event) => update(index, 0, event.target.value)}
          />
          <Input
            className="font-mono text-xs"
            placeholder={placeholderValue}
            value={value}
            onChange={(event) => update(index, 1, event.target.value)}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove row"
            onClick={() => {
              const next = { ...pairs };
              delete next[key];
              onChange(next);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ))}
      <Button variant="subtle" size="sm" onClick={() => onChange({ ...pairs, "": "" })}>
        <Plus className="h-3.5 w-3.5" /> Add row
      </Button>
    </div>
  );
}
