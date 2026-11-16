import { z } from "zod";

/** All request validation lives here so controllers stay thin. */

export const ENVIRONMENTS = ["development", "staging", "production"] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
});

export const updateProjectSchema = createProjectSchema.partial();

export const memberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const createSecretSchema = z.object({
  key: z.string().trim().min(1).max(128),
  value: z.string().min(1).max(10_000),
  environment: z.enum(ENVIRONMENTS),
});

export const updateSecretSchema = z.object({
  key: z.string().trim().min(1).max(128).optional(),
  value: z.string().min(1).max(10_000).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
});

export const bulkSecretsSchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(128),
        value: z.string().min(1).max(10_000),
        environment: z.enum(ENVIRONMENTS),
      }),
    )
    .max(200),
});

export const apiSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
});

const headersSchema = z.record(z.string());
const errorModeSchema = z.enum(["none", "random", "always"]);

export const endpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().trim().min(1).max(200),
  statusCode: z.number().int().min(100).max(599).optional().default(200),
  delayMs: z.number().int().min(0).max(10_000).optional().default(0),
  description: z.string().trim().max(300).optional().default(""),
  headers: headersSchema.optional().default({}),
  responseBody: z.string().max(500_000).optional().default(""),
  errorMode: errorModeSchema.optional().default("none"),
  errorStatus: z.number().int().min(100).max(599).optional().default(500),
  enabled: z.boolean().optional().default(true),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
});

export const authInputSchema = z.object({
  type: z.enum(["none", "bearer", "basic"]).default("none"),
  token: z.string().max(2_000).optional(),
  username: z.string().max(200).optional(),
  password: z.string().max(200).optional(),
});

export const requestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  url: z.string().trim().min(3).max(2_000),
  headers: headersSchema.optional().default({}),
  params: headersSchema.optional().default({}),
  body: z.string().max(500_000).optional().default(""),
  auth: authInputSchema.optional().default({ type: "none" }),
});

export const runSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string().trim().min(3).max(2_000),
  headers: headersSchema.optional().default({}),
  body: z.string().max(500_000).optional().default(""),
});

export const importOpenApiSchema = z.object({
  content: z.string().min(3).max(5_000_000),
});

export const fakeDataSchema = z.object({
  type: z.enum(["users", "products", "orders", "companies", "addresses"]),
  count: z.number().int().min(1).max(100).default(10),
  seed: z.string().max(120).optional(),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(3).max(1_000),
});

export const aiSchemaSchema = z.object({
  resource: z.string().trim().min(1).max(60),
});

export const aiExplainSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().trim().max(300),
  status: z.number().int().min(100).max(599),
  body: z.string().max(4_000).default(""),
});

export const settingsPatchSchema = z.record(z.unknown());
