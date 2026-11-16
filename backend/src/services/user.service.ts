import bcrypt from "bcryptjs";
import { db, newId, nowIso } from "../database/db";
import type { User, UserRole } from "../types";
import { ApiError } from "../utils/api-error";
import { randomToken } from "../utils/crypto";
import { writeLog } from "./log.service";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasApiToken: boolean;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hasApiToken: Boolean(user.apiToken),
    createdAt: user.createdAt,
  };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<{ user: PublicUser }> {
  const email = input.email.toLowerCase().trim();

  const existing = await db.users.first((user) => user.email === email);
  if (existing) throw ApiError.conflict("An account with this email already exists");

  // The very first account bootstraps the workspace as ADMIN.
  const isFirstUser = (await db.users.all()).length === 0;
  const role: UserRole = isFirstUser ? "ADMIN" : "MEMBER";

  const user: User = {
    id: newId(),
    name: input.name.trim(),
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    role,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.users.insert(user);
  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    action: "auth.register",
    meta: { role },
  });

  return { user: toPublicUser(user) };
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function authenticate(input: LoginInput): Promise<User> {
  const email = input.email.toLowerCase().trim();
  const user = await db.users.first((candidate) => candidate.email === email);
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid email or password");
  return user;
}

export async function logLogin(user: User, via: "password" | "token"): Promise<void> {
  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    action: "auth.login",
    meta: { via },
  });
}

export async function getUserById(id: string): Promise<User | undefined> {
  return db.users.byId(id);
}

export async function updateProfile(
  userId: string,
  patch: { name?: string },
): Promise<PublicUser> {
  const user = await db.users.update(userId, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    updatedAt: nowIso(),
  });
  if (!user) throw ApiError.notFound("User not found");
  if (patch.name !== undefined) {
    await writeLog({ type: "user", actor: user.email, userId, action: "profile.updated" });
  }
  return toPublicUser(user);
}

/** Issue (or rotate) a long-lived CLI token bound to the user. */
export async function issueApiToken(userId: string): Promise<string> {
  const token = `t0rdix_${randomToken(24)}`;
  const user = await db.users.update(userId, { apiToken: token, updatedAt: nowIso() });
  if (!user) throw ApiError.notFound("User not found");
  await writeLog({ type: "user", actor: user.email, userId, action: "api_token.issued" });
  return token;
}

export async function revokeApiToken(userId: string): Promise<void> {
  const user = await db.users.update(userId, { apiToken: undefined, updatedAt: nowIso() });
  if (!user) throw ApiError.notFound("User not found");
  await writeLog({ type: "user", actor: user.email, userId, action: "api_token.revoked" });
}

/** Authenticate a CLI API token (`t0rdix_*`). Returns the owning user. */
export async function userByApiToken(token: string): Promise<User | undefined> {
  return db.users.first((user) => user.apiToken === token);
}
