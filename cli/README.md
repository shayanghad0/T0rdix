# T0rdix CLI

The `t0rdix` CLI brings your workspace to the terminal: pull and push secrets,
serve mock endpoints, and scaffold APIs from plain-English prompts.

```bash
npm install        # inside cli/
npm run build      # → dist/index.js
node dist/index.js help
# global install (optional)
npm install -g .   # provides the `t0rdix` command
```

## Configuration

| Setting | Mechanism |
| ------- | --------- |
| Server URL | `T0RDIX_SERVER` env var, or `t0rdix server <url>`, default `http://localhost:5000` |
| Auth token | Stored at `~/.t0rdix/token` (chmod 600 on POSIX) |

## Commands

| Command | Description |
| ------- | ----------- |
| `t0rdix login` | Interactive email + password login |
| `t0rdix login --token <token>` | Authenticate with a token from *Settings → CLI access* |
| `t0rdix logout` | Clear stored credentials |
| `t0rdix whoami` | Show current identity and server |
| `t0rdix server <url>` | Point the CLI at a server (`http://localhost:5000` by default) |
| `t0rdix projects` | List your projects with ids |
| `t0rdix secrets pull` | Decrypt + write `.env.<env>` locally (`--env`, `--out`, `--project`) |
| `t0rdix secrets push` | Upsert a local dotenv file into the vault (`--file`, `--env`) |
| `t0rdix mock routes` | List the project's live mock routes |
| `t0rdix mock start` | Serve mock endpoints on a local port (`--port`, default 4000) |
| `t0rdix api generate "<prompt>"` | AI-scaffold a mock API from text and apply it to a project |
| `t0rdix openapi export` | Download the generated OpenAPI 3 document (`--out`) |

## Typical workflow

```bash
t0rdix login
t0rdix projects

# Sync secrets for the dev environment
t0rdix secrets pull --env development --out .env.development

# Share a local change with the team
t0rdix secrets push --file .env.development --env development

# Terminal mock server (proxies to the T0rdix gateway)
t0rdix mock start --project prj-saas-api --port 4000

# Scaffold an API by describing it
t0rdix api generate --project prj-saas-api "a blogging api with posts and comments"
```

> The mock server proxied through `t0rdix mock start` keeps delay and error
> simulation consistent with the web preview, because both hit the same
> gateway logic.
