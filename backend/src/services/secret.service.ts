import { db, newId, nowIso } from "../database/db";
import type { EnvironmentName, Secret, SecretVersion } from "../types";
import { ApiError } from "../utils/api-error";
import { decryptSecret, encryptSecret } from "../utils/crypto";
import { writeLog } from "./log.service";
import type { JwtUser } from "../utils/jwt";

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_.]{0,127}$/;
export const ENVIRONMENTS: EnvironmentName[] = ["development", "staging", "production"];

export function assertEnvironment(name: string): EnvironmentName {
  if (!ENVIRONMENTS.includes(name as EnvironmentName)) {
    throw ApiError.badRequest(`Environment must be one of: ${ENVIRONMENTS.join(", ")}`);
  }
  return name as EnvironmentName;
}

export interface SecretDTO {
  id: string;
  projectId: string;
  environment: EnvironmentName;
  key: string;
  encryptedValue: string;
  version: number;
  versionsCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Public shape — never contains plaintext values. */
export function toDTO(secret: Secret): SecretDTO {
  return {
    id: secret.id,
    projectId: secret.projectId,
    environment: secret.environment,
    key: secret.key,
    encryptedValue: secret.encryptedValue,
    version: secret.versions.length,
    versionsCount: secret.versions.length,
    createdBy: secret.createdBy,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
}

export interface ListSecretsInput {
  projectId: string;
  environment?: string;
  query?: string;
}

export async function listSecrets(input: ListSecretsInput): Promise<SecretDTO[]> {
  const secrets = (await db.secrets.find((secret) => secret.projectId === input.projectId))
    .filter((secret) => (input.environment ? secret.environment === input.environment : true))
    .filter((secret) =>
      input.query ? secret.key.toLowerCase().includes(input.query.toLowerCase()) : true,
    )
    .sort((a, b) => a.key.localeCompare(b.key));

  return secrets.map(toDTO);
}

export async function getSecret(secretId: string): Promise<Secret> {
  const secret = await db.secrets.byId(secretId);
  if (!secret) throw ApiError.notFound("Secret not found");
  return secret;
}

export interface CreateSecretInput {
  projectId: string;
  key: string;
  value: string;
  environment: string;
}

export async function createSecret(user: JwtUser, input: CreateSecretInput): Promise<SecretDTO> {
  const environment = assertEnvironment(input.environment);
  const key = input.key.trim().toUpperCase();

  if (!KEY_PATTERN.test(key)) {
    throw ApiError.badRequest("Key must look like SCREAMING_SNAKE_CASE (letters, digits, _)");
  }
  if (!input.value) throw ApiError.badRequest("Value is required");

  const duplicate = await db.secrets.first(
    (secret) =>
      secret.projectId === input.projectId &&
      secret.environment === environment &&
      secret.key === key,
  );
  if (duplicate) {
    throw ApiError.conflict(`${key} already exists in ${environment}`);
  }

  const encryptedValue = encryptSecret(input.value);
  const secret: Secret = {
    id: newId(),
    projectId: input.projectId,
    environment,
    key,
    encryptedValue,
    versions: [
      { version: 1, encryptedValue, changedAt: nowIso(), changedBy: user.id },
    ],
    createdBy: user.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.secrets.insert(secret);
  await writeLog({
    type: "secret",
    actor: user.email,
    userId: user.id,
    projectId: input.projectId,
    action: "secret.created",
    meta: { key, environment },
  });
  return toDTO(secret);
}

export interface UpdateSecretInput {
  key?: string;
  value?: string;
  environment?: string;
}

export async function updateSecret(
  user: JwtUser,
  secretId: string,
  patch: UpdateSecretInput,
): Promise<SecretDTO> {
  const secret = await getSecret(secretId);

  const next: Partial<Secret> = { updatedAt: nowIso() };
  let rotated = false;
  let renamedKey: string | undefined;

  if (patch.environment !== undefined) {
    next.environment = assertEnvironment(patch.environment);
  }
  if (patch.key !== undefined) {
    const key = patch.key.trim().toUpperCase();
    if (!KEY_PATTERN.test(key)) throw ApiError.badRequest("Invalid key format");
    renamedKey = key;
    next.key = key;
  }
  if (patch.value !== undefined && patch.value !== "") {
    rotated = true;
    const encryptedValue = encryptSecret(patch.value);
    next.encryptedValue = encryptedValue;
  }

  const updated = await db.secrets.update(secretId, next);
  if (!updated) throw ApiError.notFound("Secret not found");

  if (rotated) {
    const versions: SecretVersion[] = [
      ...updated.versions,
      {
        version: updated.versions.length + 1,
        encryptedValue: updated.encryptedValue,
        changedAt: nowIso(),
        changedBy: user.id,
      },
    ];
    await db.secrets.update(secretId, { versions });
    await writeLog({
      type: "secret",
      actor: user.email,
      userId: user.id,
      projectId: updated.projectId,
      action: "secret.updated",
      meta: { key: updated.key, environment: updated.environment, version: versions.length },
    });
  } else if (renamedKey || next.environment) {
    await writeLog({
      type: "secret",
      actor: user.email,
      userId: user.id,
      projectId: updated.projectId,
      action: "secret.metadata_changed",
      meta: { key: updated.key, environment: updated.environment },
    });
  }

  const refreshed = await getSecret(secretId);
  return toDTO(refreshed);
}

export async function deleteSecret(user: JwtUser, secretId: string): Promise<void> {
  const secret = await getSecret(secretId);
  await db.secrets.remove(secretId);
  await writeLog({
    type: "secret",
    actor: user.email,
    userId: user.id,
    projectId: secret.projectId,
    action: "secret.deleted",
    meta: { key: secret.key, environment: secret.environment },
  });
}

/** Decrypt + return the current value (audit-logged). */
export async function revealSecret(user: JwtUser, secretId: string): Promise<string> {
  const secret = await getSecret(secretId);
  await writeLog({
    type: "secret",
    actor: user.email,
    userId: user.id,
    projectId: secret.projectId,
    action: "secret.revealed",
    meta: { key: secret.key, environment: secret.environment },
  });
  try {
    return decryptSecret(secret.encryptedValue);
  } catch {
    throw ApiError.internal(
      "Failed to decrypt this secret — it was likely written with a different ENCRYPTION_KEY. Re-save the secret to re-encrypt it.",
    );
  }
}

export interface VersionDTO {
  version: number;
  value: string | null;
  changedAt: string;
  changedBy: string;
}

/** Version history with decrypted values (audit-logged). */
export async function listVersions(user: JwtUser, secretId: string): Promise<VersionDTO[]> {
  const secret = await getSecret(secretId);
  await writeLog({
    type: "secret",
    actor: user.email,
    userId: user.id,
    projectId: secret.projectId,
    action: "secret.history_viewed",
    meta: { key: secret.key, environment: secret.environment },
  });

  return secret.versions.map((version) => {
    try {
      return { version: version.version, value: decryptSecret(version.encryptedValue), changedAt: version.changedAt, changedBy: version.changedBy };
    } catch {
      return { version: version.version, value: null, changedAt: version.changedAt, changedBy: version.changedBy };
    }
  });
}

/** Roll back to a previous version by re-encrypting its value as a new version. */
export async function restoreVersion(user: JwtUser, secretId: string, version: number): Promise<SecretDTO> {
  const secret = await getSecret(secretId);
  const target = secret.versions.find((entry) => entry.version === version);
  if (!target) throw ApiError.notFound(`Version ${version} not found`);

  return updateSecret(user, secretId, { value: revealRaw(target.encryptedValue) });
}

function revealRaw(encryptedValue: string): string {
  try {
    return decryptSecret(encryptedValue);
  } catch {
    throw ApiError.internal("This historical version cannot be decrypted (different key).");
  }
}

/** Export as dotenv text for CLI `secrets pull` and the UI download button. */
export async function exportAsDotenv(projectId: string, environment: EnvironmentName): Promise<string> {
  const secrets = (await db.secrets.find((secret) => secret.projectId === projectId))
    .filter((secret) => secret.environment === environment)
    .sort((a, b) => a.key.localeCompare(b.key));

  const lines = secrets.map((secret) => {
    let value: string;
    try {
      value = decryptSecret(secret.encryptedValue);
    } catch {
      value = "";
    }
    const quoted = /[\s"']/.test(value) ? JSON.stringify(value) : value;
    return `${secret.key}=${quoted}`;
  });

  return [`# T0rdix export — project ${projectId} — ${environment}`, `# exported ${nowIso()}`, lines.join("\n"), ""].join("\n");
}

/** Bulk upsert used by CLI `secrets push`. */
export interface BulkSecretInput {
  key: string;
  value: string;
  environment: string;
}

export async function bulkUpsert(
  user: JwtUser,
  projectId: string,
  items: BulkSecretInput[],
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const environment = assertEnvironment(item.environment);
    const key = item.key.trim().toUpperCase();
    if (!KEY_PATTERN.test(key)) continue;

    const existing = await db.secrets.first(
      (secret) => secret.projectId === projectId && secret.environment === environment && secret.key === key,
    );

    if (existing) {
      await updateSecret(user, existing.id, { value: item.value, environment });
      updated += 1;
    } else {
      await createSecret(user, { projectId, key, value: item.value, environment });
      created += 1;
    }
  }

  return { created, updated };
}

/** Parse dotenv-style content into key/value pairs (CLI helper shared by API). */
export function parseDotenv(content: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    pairs.push({ key, value });
  }
  return pairs;
}
