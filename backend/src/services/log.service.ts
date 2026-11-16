import { db, newId, nowIso, trimLogs, LOG_LIMIT } from "../database/db";
import type { LogEntry, LogType } from "../types";

export interface WriteLogInput {
  type: LogType;
  actor: string;
  action: string;
  userId?: string;
  projectId?: string;
  method?: LogEntry["method"];
  path?: string;
  status?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

/**
 * Append-only activity log. Never store secret values here — only keys and
 * metadata. Kept bounded by `LOG_LIMIT` (oldest entries are trimmed).
 */
export async function writeLog(input: WriteLogInput): Promise<LogEntry> {
  const entry: LogEntry = {
    id: newId(),
    type: input.type,
    actor: input.actor,
    action: input.action,
    userId: input.userId,
    projectId: input.projectId,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
    meta: input.meta,
    createdAt: nowIso(),
  };
  await db.logs.insert(entry);
  void trimLogs();
  return entry;
}

export interface QueryLogsInput {
  projectId?: string;
  type?: LogType;
  limit?: number;
  since?: string;
}

export async function queryLogs(input: QueryLogsInput): Promise<LogEntry[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const logs = await db.logs.all();

  return logs
    .filter((log) => (input.projectId ? log.projectId === input.projectId : true))
    .filter((log) => (input.type ? log.type === input.type : true))
    .filter((log) => (input.since ? new Date(log.createdAt) >= new Date(input.since) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export { LOG_LIMIT };
