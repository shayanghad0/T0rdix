import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageLoader } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/utils";
import type { LogEntry, LogType } from "@/types";

const TABS: (LogType | "all")[] = ["all", "api", "user", "secret"];

/** Unified activity log: mock calls, user actions and secret changes. */
export function LogsPage() {
  const activeProjectId = useUiStore((state) => state.activeProjectId);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<LogType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<LogEntry[]>("/logs", {
        projectId: activeProjectId ?? undefined,
        type: tab === "all" ? undefined : tab,
        limit: "100",
      });
      setLogs(data);
    } catch (cause) {
      toast.error("Failed to load logs", cause instanceof Error ? cause.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);

  const columns: Column<LogEntry>[] = [
    { key: "type", header: "Type", render: (log) => <Badge variant={log.type === "secret" ? "primary" : log.type === "api" ? "accent" : "default"}>{log.type}</Badge> },
    {
      key: "action",
      header: "Action",
      render: (log) => <span className="text-xs text-content">{log.action}</span>,
    },
    {
      key: "request",
      header: "Request",
      render: (log) =>
        log.method ? (
          <span className="flex items-center gap-2">
            <MethodBadge method={log.method} />
            <code className="max-w-64 truncate font-mono text-[11px] text-muted">{log.path}</code>
          </span>
        ) : (
          <span className="text-xs text-faint">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (log) =>
        log.status !== undefined ? (
          <Badge variant={log.status < 400 ? "success" : "danger"}>{log.status}</Badge>
        ) : (
          <span className="text-xs text-faint">—</span>
        ),
    },
    { key: "duration", header: "Duration", render: (log) => <span className="text-xs text-faint">{log.durationMs !== undefined ? `${log.durationMs}ms` : "—"}</span> },
    { key: "actor", header: "Actor", render: (log) => <span className="text-xs text-muted">{log.actor}</span> },
    { key: "time", header: "When", render: (log) => <span className="whitespace-nowrap text-xs text-faint">{relativeTime(log.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Observability</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-content">Activity Logs</h1>
          <p className="mt-1 text-sm text-muted">API calls, user actions and secret changes — values are never logged.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "subtle"}
            size="sm"
            onClick={() => setAutoRefresh((current) => !current)}
          >
            <RefreshCw className={autoRefresh ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </Button>
          <Button variant="subtle" size="sm" onClick={() => void refresh()}>
            <ScrollText className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </header>

      <div className="flex gap-2">
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            className={
              tab === entry
                ? "rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-xs font-medium text-content"
                : "rounded-full border border-line/70 px-3.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-content"
            }
          >
            {entry === "all" ? "All" : entry}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader label="Fetching logs" />
      ) : (
        <SpotlightCard className="p-4">
          <DataTable
            columns={columns}
            rows={logs}
            rowKey={(log) => log.id}
            empty={<p className="py-10 text-center text-xs text-faint">No log entries in this scope yet.</p>}
          />
        </SpotlightCard>
      )}
    </div>
  );
}
