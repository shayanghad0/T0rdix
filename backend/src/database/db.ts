import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  AppSettings,
  Collection,
  LogEntry,
  MockApi,
  Project,
  Secret,
  User,
} from "../types";
import { JsonCollection } from "./json-db";
import { encryptSecret } from "../utils/crypto";
import { buildSeed } from "./seed-data";

/** Instantiated collections — the single source of truth for persistence. */
export const db = {
  users: new JsonCollection<User>("users.json", () => buildSeed().users),
  projects: new JsonCollection<Project>("projects.json", () => buildSeed().projects),
  secrets: new JsonCollection<Secret>("secrets.json", () => buildSeed().secrets),
  apis: new JsonCollection<MockApi>("apis.json", () => buildSeed().apis),
  collections: new JsonCollection<Collection>("collections.json", () => buildSeed().collections),
  logs: new JsonCollection<LogEntry>("logs.json", () => buildSeed().logs),
  settings: new JsonCollection<AppSettings>("settings.json", () => [
    { id: "app", version: 1, seededAt: new Date().toISOString(), values: {} },
  ]),
};

/** Default cap so logs.json never grows unbounded on a machine. */
export const LOG_LIMIT = 3000;

export async function trimLogs(): Promise<void> {
  const logs = await db.logs.all();
  if (logs.length > LOG_LIMIT) {
    await db.logs.setAll(logs.slice(logs.length - LOG_LIMIT));
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Trigger loading (and therefore first-run seeding) of every collection. */
export async function initDatabase(): Promise<void> {
  await Promise.all([
    db.users.all(),
    db.projects.all(),
    db.secrets.all(),
    db.apis.all(),
    db.collections.all(),
    db.logs.all(),
    db.settings.all(),
  ]);
}

export type { JsonCollection };
