import { db, newId, nowIso } from "../database/db";
import type { Project } from "../types";
import { ApiError } from "../utils/api-error";
import { writeLog } from "./log.service";
import type { JwtUser } from "../utils/jwt";

export interface ProjectContext {
  project: Project;
  role: "ADMIN" | "MEMBER";
}

/** Resolve a project and the caller's role in it (global ADMINs bypass). */
export async function requireProjectAccess(
  projectId: string,
  user: JwtUser,
): Promise<ProjectContext> {
  const project = await db.projects.byId(projectId);
  if (!project) throw ApiError.notFound("Project not found");

  const membership = project.members.find((member) => member.userId === user.id);
  if (!membership && user.role !== "ADMIN") {
    throw ApiError.forbidden("You are not a member of this project");
  }

  return { project, role: membership?.role ?? "ADMIN" };
}

export async function assertProjectAdmin(
  projectId: string,
  user: JwtUser,
): Promise<Project> {
  const { project, role } = await requireProjectAccess(projectId, user);
  if (role !== "ADMIN") throw ApiError.forbidden("Project admin permission required");
  return project;
}

export async function listProjectsForUser(user: JwtUser): Promise<Project[]> {
  const projects = await db.projects.all();
  return projects
    .filter((project) => project.members.some((m) => m.userId === user.id) || user.role === "ADMIN")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export async function createProject(user: JwtUser, input: CreateProjectInput): Promise<Project> {
  const project: Project = {
    id: newId(),
    name: input.name.trim(),
    description: input.description.trim(),
    ownerId: user.id,
    members: [{ userId: user.id, role: "ADMIN", addedAt: nowIso() }],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.projects.insert(project);
  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    projectId: project.id,
    action: "project.created",
    meta: { name: project.name },
  });
  return project;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export async function updateProject(
  projectId: string,
  user: JwtUser,
  patch: UpdateProjectInput,
): Promise<Project> {
  await assertProjectAdmin(projectId, user);
  const updated = await db.projects.update(projectId, {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    updatedAt: nowIso(),
  });
  if (!updated) throw ApiError.notFound("Project not found");
  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    projectId,
    action: "project.updated",
    meta: { ...patch } as Record<string, unknown>,
  });
  return updated;
}

export async function deleteProject(projectId: string, user: JwtUser): Promise<void> {
  await assertProjectAdmin(projectId, user);

  await db.projects.remove(projectId);
  await db.secrets.removeWhere((secret) => secret.projectId === projectId);
  await db.apis.removeWhere((api) => api.projectId === projectId);
  await db.collections.removeWhere((collection) => collection.projectId === projectId);

  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    action: "project.deleted",
    meta: { projectId },
  });
}

export async function addMember(
  projectId: string,
  user: JwtUser,
  input: { email: string; role: "ADMIN" | "MEMBER" },
): Promise<Project> {
  await assertProjectAdmin(projectId, user);

  const target = await db.users.first((candidate) => candidate.email === input.email.toLowerCase().trim());
  if (!target) throw ApiError.notFound(`No user with email ${input.email}`);
  if (target.id === user.id) throw ApiError.conflict("You are already a member of this project");

  const { project } = await requireProjectAccess(projectId, user);
  if (project.members.some((member) => member.userId === target.id)) {
    throw ApiError.conflict("User is already a member");
  }

  project.members.push({ userId: target.id, role: input.role, addedAt: nowIso() });
  const updated = await db.projects.update(projectId, {
    members: project.members,
    updatedAt: nowIso(),
  });
  if (!updated) throw ApiError.notFound("Project not found");

  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    projectId,
    action: "member.added",
    meta: { email: target.email, role: input.role },
  });
  return updated;
}

export async function removeMember(
  projectId: string,
  user: JwtUser,
  memberUserId: string,
): Promise<Project> {
  await assertProjectAdmin(projectId, user);
  const { project } = await requireProjectAccess(projectId, user);

  if (project.ownerId === memberUserId) {
    throw ApiError.conflict("The project owner cannot be removed");
  }

  const members = project.members.filter((member) => member.userId !== memberUserId);
  const updated = await db.projects.update(projectId, { members, updatedAt: nowIso() });
  if (!updated) throw ApiError.notFound("Project not found");

  await writeLog({
    type: "user",
    actor: user.email,
    userId: user.id,
    projectId,
    action: "member.removed",
    meta: { memberUserId },
  });
  return updated;
}
