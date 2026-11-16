import bcrypt from "bcryptjs";
import { AppSettings, Collection, LogEntry, MockApi, Project, Secret, User } from "../types";
import { encryptSecret } from "../utils/crypto";

/**
 * First-run seed content. Stable, human-readable ids are used so mock URLs
 * remain predictable across restarts (nice for docs and the CLI).
 */
export interface SeedBundle {
  users: User[];
  projects: Project[];
  secrets: Secret[];
  apis: MockApi[];
  collections: Collection[];
  logs: LogEntry[];
  settings: AppSettings[];
}

const ADMIN_ID = "usr-admin";
const MEMBER_ID = "usr-member";
const PROJECT_ID = "prj-saas-api";
const USERS_API_ID = "api-users";
const PAYMENTS_API_ID = "api-payments";
const COLLECTION_ID = "col-smoke-tests";

export function buildSeed(): SeedBundle {
  const now = new Date().toISOString();
  const earlier = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();

  const admin: User = {
    id: ADMIN_ID,
    name: "Admin",
    email: "admin@t0rdix.dev",
    passwordHash: bcrypt.hashSync("admin123", 10),
    role: "ADMIN",
    createdAt: earlier,
    updatedAt: earlier,
  };

  const member: User = {
    id: MEMBER_ID,
    name: "Demo Member",
    email: "member@t0rdix.dev",
    passwordHash: bcrypt.hashSync("member123", 10),
    role: "MEMBER",
    createdAt: earlier,
    updatedAt: earlier,
  };

  const project: Project = {
    id: PROJECT_ID,
    name: "My SaaS API",
    description: "Design of the flagship SaaS platform — secrets, mocks and tests.",
    ownerId: ADMIN_ID,
    members: [
      { userId: ADMIN_ID, role: "ADMIN", addedAt: earlier },
      { userId: MEMBER_ID, role: "MEMBER", addedAt: earlier },
    ],
    createdAt: earlier,
    updatedAt: earlier,
  };

  const secret = (
    id: string,
    key: string,
    value: string,
    environment: Secret["environment"],
    createdBy: string,
  ): Secret => ({
    id,
    projectId: PROJECT_ID,
    environment,
    key,
    encryptedValue: encryptSecret(value),
    versions: [{ version: 1, encryptedValue: encryptSecret(value), changedAt: earlier, changedBy: createdBy }],
    createdBy,
    createdAt: earlier,
    updatedAt: earlier,
  });

  const secrets: Secret[] = [
    secret("sec-openai-dev", "OPENAI_API_KEY", "sk-demo-4f8a2b91c7e0-demo", "development", ADMIN_ID),
    secret("sec-openai-prod", "OPENAI_API_KEY", "sk-demo-live-9911-xd", "production", ADMIN_ID),
    secret("sec-db-dev", "DATABASE_URL", "postgres://demo:demo@localhost:5432/app", "development", ADMIN_ID),
    secret("sec-jwt-prod", "JWT_SECRET", "prod-super-secret-key-demo", "production", ADMIN_ID),
    secret("sec-stripe-stg", "STRIPE_API_KEY", "sk_test_demo_staging_51H8xQ", "staging", ADMIN_ID),
  ];

  const endpoint = (
    id: string,
    method: MockApi["endpoints"][number]["method"],
    path: string,
    statusCode: number,
    responseBody: string,
    extra: Partial<MockApi["endpoints"][number]> = {},
  ): MockApi["endpoints"][number] => ({
    id,
    method,
    path,
    statusCode,
    delayMs: 0,
    description: "",
    headers: { "content-type": "application/json" },
    responseBody,
    errorMode: "none",
    errorStatus: 500,
    enabled: true,
    createdAt: earlier,
    updatedAt: earlier,
    ...extra,
  });

  const usersApi: MockApi = {
    id: USERS_API_ID,
    projectId: PROJECT_ID,
    name: "Users API",
    description: "Classic CRUD surface used across the docs and CLI examples.",
    endpoints: [
      endpoint(
        "ep-users-list",
        "GET",
        "/users",
        200,
        JSON.stringify(
          {
            data: [
              { id: 1, name: "John Doe", email: "john@t0rdix.dev" },
              { id: 2, name: "Alice Cooper", email: "alice@t0rdix.dev" },
            ],
            total: 2,
          },
          null,
          2,
        ),
        { description: "List all users." },
      ),
      endpoint(
        "ep-users-get",
        "GET",
        "/users/:id",
        200,
        JSON.stringify({ data: { id: 1, name: "John Doe", email: "john@t0rdix.dev" } }, null, 2),
      ),
      endpoint(
        "ep-users-create",
        "POST",
        "/users",
        201,
        JSON.stringify({ data: { id: 3, name: "New User", email: "new@t0rdix.dev" } }, null, 2),
      ),
      endpoint(
        "ep-users-delete",
        "DELETE",
        "/users/:id",
        200,
        JSON.stringify({ success: true, deletedId: 1 }, null, 2),
      ),
    ],
    createdAt: earlier,
    updatedAt: earlier,
  };

  const paymentsApi: MockApi = {
    id: PAYMENTS_API_ID,
    projectId: PROJECT_ID,
    name: "Payments API",
    description: "Demonstrates latency and error simulation.",
    endpoints: [
      endpoint(
        "ep-payments-list",
        "GET",
        "/payments",
        200,
        JSON.stringify({ data: [{ id: "pay_01", amount: 4900, currency: "usd", status: "paid" }] }, null, 2),
        { delayMs: 350, description: "Flaky in production — 25% simulated 500s." },
      ),
      endpoint(
        "ep-payments-create",
        "POST",
        "/payments",
        201,
        JSON.stringify({ data: { id: "pay_02", amount: 6400, currency: "usd", status: "pending" } }, null, 2),
        { errorMode: "random", errorStatus: 500 },
      ),
      endpoint(
        "ep-payments-refund",
        "POST",
        "/payments/:id/refund",
        200,
        JSON.stringify({ data: { id: "pay_01", status: "refunded" } }, null, 2),
        { delayMs: 900 },
      ),
    ],
    createdAt: earlier,
    updatedAt: earlier,
  };

  const collections: Collection[] = [
    {
      id: COLLECTION_ID,
      projectId: PROJECT_ID,
      name: "Smoke tests",
      description: "Quick checks against the local mock gateway.",
      requests: [
        {
          id: "req-list-users",
          name: "List users",
          method: "GET",
          url: `http://localhost:5000/api/mock/${PROJECT_ID}/users`,
          headers: {},
          params: {},
          body: "",
          auth: { type: "none" },
          createdAt: earlier,
          updatedAt: earlier,
        },
        {
          id: "req-get-user",
          name: "Get user by id",
          method: "GET",
          url: `http://localhost:5000/api/mock/${PROJECT_ID}/users/1`,
          headers: {},
          params: {},
          body: "",
          auth: { type: "none" },
          createdAt: earlier,
          updatedAt: earlier,
        },
      ],
      createdAt: earlier,
      updatedAt: earlier,
    },
  ];

  const logs: LogEntry[] = [
    {
      id: "log-seed-1",
      type: "user",
      actor: admin.email,
      userId: ADMIN_ID,
      projectId: PROJECT_ID,
      action: "project.created",
      meta: { project: project.name, seeded: true },
      createdAt: earlier,
    },
    {
      id: "log-seed-2",
      type: "secret",
      actor: admin.email,
      userId: ADMIN_ID,
      projectId: PROJECT_ID,
      action: "secret.created",
      meta: { key: "OPENAI_API_KEY", environment: "development", encrypted: "aes-256-gcm" },
      createdAt: earlier,
    },
  ];

  const settings: AppSettings[] = [
    { id: "app", version: 1, seededAt: now, values: {} },
  ];

  return { users: [admin, member], projects: [project], secrets, apis: [usersApi, paymentsApi], collections, logs, settings };
}
