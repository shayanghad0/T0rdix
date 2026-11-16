import { db, newId, nowIso } from "../database/db";
import type { Collection, CollectionRequest, RequestAuth } from "../types";
import { ApiError } from "../utils/api-error";

export interface RequestInput {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  auth?: RequestAuth;
}

function normalizeRequestInput(input: RequestInput): Pick<CollectionRequest, "name" | "method" | "url" | "headers" | "params" | "body" | "auth"> {
  if (!input.name?.trim()) throw ApiError.badRequest("Request name is required");
  if (!input.url?.trim()) throw ApiError.badRequest("Request URL is required");
  return {
    name: input.name.trim(),
    method: (input.method || "GET").toUpperCase() as CollectionRequest["method"],
    url: input.url.trim(),
    headers: input.headers ?? {},
    params: input.params ?? {},
    body: input.body ?? "",
    auth: input.auth ?? { type: "none" },
  };
}

export async function listCollections(projectId: string): Promise<Collection[]> {
  const collections = await db.collections.find((collection) => collection.projectId === projectId);
  return collections.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollection(collectionId: string): Promise<Collection> {
  const collection = await db.collections.byId(collectionId);
  if (!collection) throw ApiError.notFound("Collection not found");
  return collection;
}

export async function createCollection(
  projectId: string,
  input: { name: string; description?: string },
): Promise<Collection> {
  const collection: Collection = {
    id: newId(),
    projectId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    requests: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.collections.insert(collection);
  return collection;
}

export async function updateCollection(
  collectionId: string,
  patch: { name?: string; description?: string },
): Promise<Collection> {
  await getCollection(collectionId);
  const updated = await db.collections.update(collectionId, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    updatedAt: nowIso(),
  });
  if (!updated) throw ApiError.notFound("Collection not found");
  return updated;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const removed = await db.collections.remove(collectionId);
  if (!removed) throw ApiError.notFound("Collection not found");
}

export async function addRequest(collectionId: string, input: RequestInput): Promise<CollectionRequest> {
  const collection = await getCollection(collectionId);
  const request: CollectionRequest = {
    id: newId(),
    ...normalizeRequestInput(input),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  collection.requests.push(request);
  const updated = await db.collections.update(collectionId, {
    requests: collection.requests,
    updatedAt: nowIso(),
  });
  if (!updated) throw ApiError.notFound("Collection not found");
  return request;
}

export async function updateRequest(
  requestId: string,
  patch: Partial<RequestInput>,
): Promise<CollectionRequest> {
  for (const collection of await db.collections.all()) {
    const index = collection.requests.findIndex((request) => request.id === requestId);
    if (index === -1) continue;

    const merged = normalizeRequestInput({ ...collection.requests[index], ...patch } as RequestInput);
    const requests = [...collection.requests];
    requests[index] = { ...requests[index], ...merged, updatedAt: nowIso() };
    await db.collections.update(collection.id, { requests, updatedAt: nowIso() });
    return requests[index];
  }
  throw ApiError.notFound("Request not found");
}

export async function deleteRequest(requestId: string): Promise<void> {
  for (const collection of await db.collections.all()) {
    const requests = collection.requests.filter((request) => request.id !== requestId);
    if (requests.length !== collection.requests.length) {
      await db.collections.update(collection.id, { requests, updatedAt: nowIso() });
      return;
    }
  }
  throw ApiError.notFound("Request not found");
}
