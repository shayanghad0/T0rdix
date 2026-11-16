<div align="center">

# T0rdix

**The all-in-one, local-first developer workspace.**

Secret Management · API Mock Studio · API Testing · OpenAPI Tools · Fake Data · Team Workspace · CLI

*The open-source alternative that combines the best of Postman, Mockoon, dotenv-vault and Swagger tools — running 100% on your machine with zero external dependencies.*

`Node.js · Express · TypeScript · React · Vite · TailwindCSS · JSON storage`

</div>

---

## Why T0rdix?

Most teams stitch together half a dozen tools to build APIs: a vault for secrets, a mock server, an API client, a spec editor, a fake data generator — each with its own login, config and cloud account.

**T0rdix puts all of it in one workspace that runs locally.** One `npm run dev` for the backend, one for the frontend — no Docker, no PostgreSQL, no Firebase, no cloud. Your secrets are encrypted on your disk. Your mock APIs run on your ports.

| | |
| --- | --- |
| 🔐 **Secret Manager** | AES-256-GCM encrypted vault with environments, version history, reveal audit trail, `.env` import/export |
| 🧪 **API Mock Studio** | Dynamic mock servers with status codes, latency & error simulation, live at `/api/mock/:project/...` |
| 🚀 **API Testing** | Postman-style collections with headers, params, body, auth — proxied through the server for zero-CORS |
| 📄 **OpenAPI Tools** | Import `swagger.json` / `openapi.json` → instant mocks; export a generated OpenAPI 3 document |
| 🎲 **Fake Data Generator** | Seeded, reproducible datasets: users, products, orders, companies, addresses |
| 👥 **Team Workspace** | Projects with ADMIN/MEMBER roles, member invites, shared resources |
| 📜 **Activity Logs** | API calls, user actions and secret changes in one audit feed (values never logged) |
| ⌨️ **CLI** | `t0rdix secrets pull/push`, `t0rdix mock start`, `t0rdix api generate` from your terminal |
| 🤖 **AI-Ready** | Pluggable provider architecture with an offline heuristic provider — no paid APIs |

---

## Quick Start

Requirements: **Node.js ≥ 18.17**.

```bash
# 1 — install everything (backend + frontend + cli)
npm run setup

# 2 — run backend (:5000) and frontend (:5173) together in one terminal
npm run dev
```

That's it. You'll get colorized, labeled output from both processes:

```
[api] T0rdix API is running → http://localhost:5000/api/health
[web] VITE v5.4.21  ready in 588 ms
[web] ➜  Local: http://localhost:5173/
```

If either process crashes, the other is shut down automatically. `Ctrl+C` stops both.
Prefer separate terminals? Use `npm run dev:backend` and `npm run dev:frontend`.

### CLI (optional)

```bash
cd cli
npm install
npm run build
node dist/index.js help
# or install the `t0rdix` command globally:
npm install -g .
```

Or from the repo root:

```bash
npm run install:all        # installs backend + frontend + cli
npm run dev                # both services, one terminal
npm run build              # backend + frontend + cli production builds
npm run typecheck          # strict TS check across all packages
```

### First login

The database seeds itself on first boot:

| Account | Password | Role |
| ------- | -------- | ---- |
| `admin@t0rdix.dev` | `admin123` | ADMIN |
| `member@t0rdix.dev` | `member123` | MEMBER |

> The **first account you register** through the UI automatically becomes `ADMIN`.
> Change the seeded passwords immediately for anything beyond local experimentation.

### Environment configuration

Copy `.env.example` → `backend/.env` and set:

```ini
PORT=5000
JWT_SECRET=change-me-to-a-long-random-string
ENCRYPTION_KEY=            # 64 hex chars — generate with the command in the file
CORS_ORIGIN=http://localhost:5173
```

`ENCRYPTION_KEY` is used for AES-256-GCM secret encryption. If omitted, a
development key is derived from `JWT_SECRET` (with a console warning). Secrets
written under one key cannot be read under another — set a real key before
storing anything valuable, then re-save existing secrets to re-encrypt them.

---

## Feature Guide

### 1 · Secret Manager (`/secrets`)

- Keys follow `SCREAMING_SNAKE_CASE`; values are **encrypted at rest** and never
  returned in list responses.
- Three environments — `development`, `staging`, `production` — fully separated.
- **Version history**: every value change creates a new version; browse and
  **restore** any previous version (restores are themselves new versions).
- **Reveal-on-demand**: viewing a value requires an explicit click and
  writes a `secret.revealed` audit entry.
- **Import**: paste a `.env` file to bulk-create/update against one environment.
- **Export**: download decrypted `.env.<environment>` files (audit logged).

### 2 · API Mock Studio (`/apis`, `/mock`)

Define endpoints — method, path, status code, response body, delay (ms), and
error simulation (`none | random ≈30% | always`) — and they're served instantly:

```
GET    http://localhost:5000/api/mock/<projectId>/users
POST   http://localhost:5000/api/mock/<projectId>/users
GET    http://localhost:5000/api/mock/<projectId>/payments           ← 350ms delay
POST   http://localhost:5000/api/mock/<projectId>/payments           ← 30% random 500s
GET    http://localhost:5000/api/mock/<projectId>                    ← route discovery JSON
```

- Path params: `/users/:id` matches any id (most literal route wins).
- Every gateway call is logged with method, path, status and duration.
- "Click to copy" URLs, quick-test panel, and a live route explorer in `/mock`.

### 3 · API Testing (`/testing`)

- Build requests with method, URL, **params, headers, JSON body, auth** (Bearer/Basic).
- Save requests into **collections** per project; reload them with one click.
- Requests execute **through the backend** (`POST /api/run`) — no browser CORS walls.
- Response viewer with status, timing, size, headers and pretty-printed body.

### 4 · OpenAPI Management

**Import** — upload/paste `openapi.json` or `swagger.json` (2.x and 3.x):
- Every `(path, method)` becomes a live mock endpoint,
- Response bodies are synthesized from `example`/`examples`/JSON schema,
- A starter collection of GET requests is generated automatically.

**Export** — `GET /api/projects/:id/openapi` returns an OpenAPI 3.0.3 document
generated from your mock endpoints (tagged by API, with real examples).
Also available via the CLI: `t0rdix openapi export`.

### 5 · Fake Data Generator (`/fake-data`)

Users, products, orders, companies, addresses — 1–100 rows per run. **Seeded**
with an internal xorshift PRNG, so `seed: "demo"` always produces the same
dataset (great for stable fixtures). Copy or download output as JSON.

### 6 · Team Workspace (`/projects`, `/projects/:id`)

- Create projects; each owns its secrets, APIs, collections and logs.
- Add members by email with `ADMIN`/`MEMBER` roles; project admins manage access.
- Dashboard with workspace stats: counts + mock-call volume (24h), endpoint
  preview and team roster.

### 7 · Activity Logs (`/logs`)

One feed, three types (`api`, `user`, `secret`), filterable by project and type,
with an optional 4s live-refresh. Secret **values are never** logged — only key
names, versions and actors.

### 8 · CLI (`cli/`)

```bash
t0rdix login                       # email+password interactive, or --token <token>
t0rdix whoami                      # identity + server
t0rdix projects                    # list projects with ids
t0rdix secrets pull --env development --out .env.development
t0rdix secrets push --file .env.development --env development
t0rdix mock start --project <id> --port 4000
t0rdix mock routes --project <id>
t0rdix api generate --project <id> "a blogging api with posts and comments"
t0rdix openapi export --project <id> --out openapi.json
t0rdix server <url>                # point the CLI elsewhere
```

Tokens are issued in the web app (**Settings → CLI access**) and stored at
`~/.t0rdix/token` (mode 600 on POSIX).

### 9 · AI-Ready Architecture (`backend/src/ai/`)

`/api/ai/*` exposes three capabilities behind a `AiProvider` interface:

| Endpoint | Capability |
| -------- | ---------- |
| `POST /api/ai/generate-api` | Scaffold a full mock API from a text prompt (add `?apply=1&projectId=…` to materialize it) |
| `POST /api/ai/generate-schema` | Generate a JSON Schema for a resource |
| `POST /api/ai/explain-error` | Human explanation of a failed request |

The default provider is **offline heuristics** — no network calls, no API keys.
To plug in a model later, implement `AiProvider` and return it from
`getAiProvider()`; no route, controller or frontend changes required.

### 10 · The Interface

Dark-mode-first, glass cards, spotlight-glow hover, expanding tab rail,
⌘K command palette, toasts, Monaco editor for JSON/env/responses, data tables,
keyboard-friendly controls, and a light theme one click away. Inspired by
Linear, Vercel, GitHub, Raycast and Supabase.

---

## Architecture

```
T0rdix/
├── backend/                  Express + TypeScript API
│   └── src/
│       ├── server.ts         bootstrap (DB init + HTTP listener)
│       ├── app.ts            middleware pipeline (helmet, cors, json, routes, errors)
│       ├── config/           typed env loader
│       ├── routes/           one router per domain → thin controllers
│       ├── controllers/      HTTP layer: validate (zod) → call service → respond
│       ├── services/         business logic (auth, projects, secrets, mocks,
│       │                     collections, openapi, fake-data, logs, settings)
│       ├── middleware/       requireAuth (JWT + CLI tokens), requireRole,
│       │                     rate-limiter, error handler
│       ├── database/         JSON-file storage engine + first-run seed
│       ├── validation/       zod schemas for every request body
│       ├── ai/               provider interface + offline heuristic provider
│       └── utils/            api-error, crypto (AES-256-GCM), jwt, forward,
│                             logger, validate, async-handler
├── frontend/                 React 18 + Vite + TailwindCSS
│   └── src/
│       ├── components/ui/    design system (button, badge, modal, toaster,
│       │                     data-table, spotlight-card, code-editor…)
│       ├── components/layout/ navbar (project switcher, user menu), ⌘K palette
│       ├── layouts/          app shell (expanding tab rail) + auth hero layout
│       ├── pages/            one module per route
│       ├── stores/           zustand: auth (persisted), toasts, ui state
│       ├── services/         typed fetch client with normalized errors
│       ├── hooks/            theme, projects, global shortcuts, debounce
│       └── types/            shared domain types
├── cli/                      t0rdix CLI (Node built-ins + dotenv only)
├── database/                 *.json — created & seeded on first boot
├── scripts/
│   └── dev.mjs               `npm run dev` orchestrator (zero-dependency)
├── prompts/                  UI design directives used to build the interface
├── .env.example              backend + frontend + CLI configuration
├── LICENSE                   MIT
└── SECURITY.md               disclosure policy + security model
```

### Request lifecycle

```
client → express.json → helmet/cors → route → controller (zod validate)
      → service (business rules, audit log) → JSON-file store (atomic writes)
      → { success, data } envelope | { success, error: { code, message } }
```

### Storage engine

`backend/src/database/json-db.ts` implements a small typed collection API
(`all / find / insert / update / remove / updateWhere / setAll`) with:

- **In-memory reads** — the file is read once, then mutated in memory,
- **Atomic writes** — write to `*.json.tmp`, then rename (with a copy fallback
  on filesystems that disallow rename-over-existing),
- **Declarative seeding** — empty/missing files bootstrap from `seed-data.ts`.

Collections: `users.json`, `projects.json`, `secrets.json`, `apis.json`,
`collections.json`, `logs.json`, `settings.json`. Logs are trimmed to the most
recent 3000 entries.

This is deliberately *not* a production database — it's the honest choice for a
local-first tool: zero setup, human-readable, trivially backed up, and swappable
(the service layer never talks to the filesystem directly).

### Security model

- **bcrypt** password hashing (10 rounds); JWT (HS256, 30d) with issuer checks;
  CLI long-lived tokens (`t0rdix_*`) accepted by the same `requireAuth`.
- **AES-256-GCM** secret encryption (random IV per write, auth tagged).
- Global role enforcement (`ADMIN`/`MEMBER`) + per-project membership checks.
- Sliding-window rate limiting on auth routes (20/min/IP).
- Secrets are redacted from every response and all logs; reveals are audited.
- Auth pages/services are exempt from CORS credentials; helmet sets baseline
  headers. See **SECURITY.md** for the full threat model and disclosure policy.

---

## Scripts

| Location | Command | Purpose |
| -------- | ------- | ------- |
| root | `npm run setup` | first-time install of all workspaces |
| root | `npm run dev` | **backend + frontend together** (one terminal, labeled output) |
| root | `npm run dev:backend` / `dev:frontend` | run each half in its own terminal |
| root | `npm run build` | build backend + frontend + CLI |
| root | `npm run typecheck` | strict TS check across packages |
| backend | `npm run dev` | tsx watch mode |
| backend | `npm run build && npm start` | production run from `dist/` |
| frontend | `npm run dev` / `build` / `preview` | Vite dev, prod build, preview |
| cli | `npm run build` | compile to `dist/index.js` |

## API Reference (v1)

All endpoints are prefixed with `/api`. Errors use
`{ success:false, error:{ code, message, details? } }`.

| Area | Endpoint | Auth |
| ---- | -------- | ---- |
| Health | `GET /health` | — |
| Auth | `POST /auth/register` · `POST /auth/login` | — (rate limited) |
| Auth | `GET/PATCH /auth/me` · `POST/DELETE /auth/me/token` | ✅ |
| Projects | `GET/POST /projects` · `GET /projects/:id/overview` · `PATCH/DELETE /projects/:id` | ✅ |
| Members | `POST /projects/:id/members` · `DELETE /projects/:id/members/:userId` | ✅ (project admin) |
| Secrets | `GET/POST /projects/:projectId/secrets` · `POST …/secrets/bulk` · `GET …/secrets/export?env=` | ✅ |
| Secrets | `PATCH/DELETE /secrets/:id` · `GET /secrets/:id/reveal` · `GET /secrets/:id/versions` · `POST /secrets/:id/versions/:version/restore` | ✅ |
| Mock APIs | `GET/POST /projects/:projectId/apis` · `PATCH/DELETE /apis/:id` · `POST /apis/:id/endpoints` · `PATCH/DELETE /endpoints/:id` | ✅ |
| Gateway | `GET /mock/:projectId` (discovery) · `ANY /mock/:projectId/*` | — (public by design) |
| Collections | `GET/POST /projects/:projectId/collections` · `PATCH/DELETE /collections/:id` · `POST /collections/:id/requests` · `PATCH/DELETE /requests/:id` · `POST /run` | ✅ |
| OpenAPI | `POST /projects/:projectId/import/openapi` · `GET /projects/:projectId/openapi` | ✅ |
| Fake data | `POST /fake-data` | ✅ |
| Logs | `GET /logs?projectId=&type=&limit=` | ✅ |
| Settings | `GET /settings` · `PATCH /settings` (ADMIN) | ✅ |
| AI | `GET /ai` · `POST /ai/generate-api` · `POST /ai/generate-schema` · `POST /ai/explain-error` | ✅ |

## Roadmap

- [ ] Response templating (Faker-style `{{faker.*}}` expressions in mock bodies)
- [ ] WebSocket mock endpoints
- [ ] Request history replay in the testing module
- [ ] Git-backed secret sync (encrypted blobs in a repo)
- [ ] Local model-backed AI provider (recognizes Ollama-style endpoints)
- [ ] Optional single-binary packaging of the whole stack

## Contributing

PRs welcome. Keep the constraints: **no Docker, no external database, no paid
APIs** — everything must keep working with a plain `npm install && npm run dev`.
Run `npm run typecheck` at the root before submitting.

## License

[MIT](./LICENSE) — © 2026 T0rdix Contributors
