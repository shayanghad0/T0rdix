import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Database, ExternalLink, Send } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageLoader } from "@/components/ui/empty-state";
import { CodeEditor } from "@/components/ui/code-editor";
import type { MockApi } from "@/types";

interface EndpointRow {
  id: string;
  method: string;
  path: string;
  status: number;
  delayMs: number;
  enabled: boolean;
}

/** Mock gateway explorer — browse live routes and fire quick test calls. */
export function MockPage() {
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const [apis, setApis] = useState<MockApi[] | null>(null);
  const [testingPath, setTestingPath] = useState<string>("");
  const [testingMethod, setTestingMethod] = useState("GET");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeProjectId) {
      setApis([]);
      return;
    }
    const data = await api.get<MockApi[]>(`/projects/${activeProjectId}/apis`);
    setApis(data);
  }, [activeProjectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={Database}
        title="No project selected"
        description="Pick a project to explore its live mock gateway routes."
      />
    );
  }
  if (!apis) return <PageLoader label="Discovering routes" />;

  const endpoints: EndpointRow[] = apis.flatMap((api) =>
    api.endpoints.map((endpoint) => ({
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      status: endpoint.statusCode,
      delayMs: endpoint.delayMs,
      enabled: endpoint.enabled,
    })),
  );

  const base = `${window.location.origin}/api/mock/${activeProjectId}`;

  const callUrl = (method: string, path: string): string => {
    const concrete = path.replace(/:(\w+)/g, "1");
    return `${base}${concrete}`;
  };

  const quickCall = async (method: string, path: string) => {
    setTestingMethod(method);
    setTestingPath(path.replace(/:(\w+)/g, "1"));
    setBusy(true);
    try {
      const url = callUrl(method, path);
      const response = await fetch(url, { method });
      const text = await response.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResult(`${/* status */ "HTTP " + response.status + " " + response.statusText}\n\n${pretty}`);
      toast.info(`${method} ${path}`, `→ ${response.status}`);
    } catch (cause) {
      setResult(String(cause));
      toast.error("Request failed");
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (method: string, path: string) => {
    const url = callUrl(method, path);
    void navigator.clipboard.writeText(url);
    setCopied(`${method}${path}`);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-faint">Gateway</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Mock Gateway</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          Public dynamic endpoints under
          <button
            onClick={() => {
              void navigator.clipboard.writeText(base);
              toast.success("Base URL copied", base);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-line/70 bg-surface-2/60 px-2 py-0.5 font-mono text-xs text-accent hover:bg-surface-2"
          >
            {base} <Copy className="h-3 w-3" />
          </button>
        </p>
      </header>

      {endpoints.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No endpoints to serve"
          description="Create mock APIs in the API Mock Studio (or import an OpenAPI spec) and they become live here instantly."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <SpotlightCard className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content">Routes ({endpoints.length})</h2>
              <Badge variant="accent">GET /api/mock/:project → discovery</Badge>
            </div>
            <ul className="divide-y divide-line/50">
              {endpoints.map((endpoint) => (
                <li key={endpoint.id} className="flex flex-wrap items-center gap-2.5 py-2.5">
                  <MethodBadge method={endpoint.method} />
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-content">{endpoint.path}</code>
                  {endpoint.delayMs > 0 ? <Badge variant="warning">+{endpoint.delayMs}ms</Badge> : null}
                  <Badge variant={endpoint.enabled ? "success" : "default"}>{endpoint.status}</Badge>
                  <Button variant="ghost" size="icon-sm" aria-label="Copy URL" onClick={() => void copyUrl(endpoint.method, endpoint.path)}>
                    {copied === `${endpoint.method}${endpoint.path}` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Open in browser" onClick={() => window.open(callUrl(endpoint.method, endpoint.path), "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Quick test" onClick={() => void quickCall(endpoint.method, endpoint.path)}>
                    <Send className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </li>
              ))}
            </ul>
          </SpotlightCard>

          <SpotlightCard glow="var(--c-accent)" className="flex flex-col p-5">
            <h2 className="text-sm font-semibold text-content">Quick test</h2>
            <div className="mt-3 flex gap-2">
              <span className="method-chip border border-line bg-surface-2 text-muted">{testingMethod}</span>
              <Input
                className="font-mono text-xs"
                placeholder="/users/1"
                value={testingPath}
                onChange={(event) => setTestingPath(event.target.value)}
              />
            </div>
            <Button
              className="mt-3 w-full"
              loading={busy}
              onClick={() => testingPath && void quickCall(testingMethod, testingPath)}
            >
              <Send className="h-3.5 w-3.5" /> Send request
            </Button>
            {result ? (
              <div className="mt-4 min-h-0 flex-1">
                <CodeEditor language="json" height={280} value={result} readOnly />
              </div>
            ) : (
              <p className="mt-6 text-center text-xs text-faint">
                Responses appear here. Calls are recorded in the project’s activity log.
              </p>
            )}
          </SpotlightCard>
        </div>
      )}
    </div>
  );
}
