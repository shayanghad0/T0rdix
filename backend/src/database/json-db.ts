import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface HasId {
  id: string;
}

/**
 * Tiny JSON-file backed entity store.
 *
 * - Data lives fully in memory; writes are synchronous-safe and atomic
 *   (tmp file + rename) so a crash never corrupts a collection.
 * - Seeding is declarative: each collection declares how to bootstrap itself.
 */
export class JsonCollection<T extends HasId> {
  private data: T[] | null = null;
  private readonly filePath: string;

  constructor(fileName: string, private readonly seedFactory: () => T[]) {
    // Default location: <repo-root>/database (works for tsx dev runs from
    // backend/src and for compiled dist/ output alike).
    const baseDir = env.databaseDir
      ? path.resolve(env.databaseDir)
      : path.resolve(__dirname, "../../../database");
    this.filePath = path.join(baseDir, fileName);
  }

  private async ensureLoaded(): Promise<T[]> {
    if (this.data) return this.data;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.data = JSON.parse(raw) as T[];
    } catch {
      this.data = this.seedFactory();
      await this.persist();
      logger.info(`Seeded ${path.basename(this.filePath)} (${this.data.length} records)`);
    }
    return this.data;
  }

  private async persist(): Promise<void> {
    if (!this.data) return;
    const target = this.filePath;
    await fs.mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
    try {
      await fs.rename(tmp, target);
    } catch {
      // Some network/Windows filesystems dislike rename-over-existing.
      await fs.copyFile(tmp, target);
      await fs.rm(tmp, { force: true });
    }
  }

  async all(): Promise<T[]> {
    return [...(await this.ensureLoaded())];
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    return (await this.ensureLoaded()).filter(predicate);
  }

  async first(predicate: (item: T) => boolean): Promise<T | undefined> {
    return (await this.ensureLoaded()).find(predicate);
  }

  async byId(id: string): Promise<T | undefined> {
    return this.first((item) => item.id === id);
  }

  async insert(item: T): Promise<T> {
    const list = await this.ensureLoaded();
    list.push(item);
    await this.persist();
    return item;
  }

  async update(id: string, patch: Partial<Omit<T, "id">>): Promise<T | undefined> {
    const list = await this.ensureLoaded();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    list[index] = { ...list[index], ...patch, id } as T;
    await this.persist();
    return list[index];
  }

  async updateWhere(
    predicate: (item: T) => boolean,
    patch: Partial<Omit<T, "id">>,
  ): Promise<T[]> {
    const list = await this.ensureLoaded();
    const updated: T[] = [];
    for (let i = 0; i < list.length; i += 1) {
      if (!predicate(list[i])) continue;
      list[i] = { ...list[i], ...patch, id: list[i].id } as T;
      updated.push(list[i]);
    }
    if (updated.length > 0) await this.persist();
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const list = await this.ensureLoaded();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    await this.persist();
    return true;
  }

  async removeWhere(predicate: (item: T) => boolean): Promise<number> {
    const list = await this.ensureLoaded();
    const before = list.length;
    const kept = list.filter((item) => !predicate(item));
    this.data = kept;
    await this.persist();
    return before - kept.length;
  }

  /** Hard-replace the whole array (used by the log trimmer). */
  async setAll(items: T[]): Promise<void> {
    this.data = items;
    await this.persist();
  }
}

// Declarations of the concrete collections are in `../database/db.ts` to keep
// seeding logic close to the entities themselves.
export const DATABASE_FILENAMES = {
  users: "users.json",
  projects: "projects.json",
  secrets: "secrets.json",
  apis: "apis.json",
  collections: "collections.json",
  logs: "logs.json",
  settings: "settings.json",
} as const;
