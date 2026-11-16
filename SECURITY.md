# Security Policy — T0rdix

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x.x   | ✅        |

## Reporting a vulnerability

T0rdix is an open-source, **local-first** developer tool. If you discover a
security issue, please **do not open a public GitHub issue for exploitable
vulnerabilities**.

Instead:

1. Go to **Security → Advisories → Report a vulnerability** on the GitHub
   repository (private disclosure), or
2. Email `security@t0rdix.dev` with:
   - A clear title and description
   - Step-by-step reproduction instructions / PoC
   - Affected version and environment
   - Any suggested fix (optional)

You will receive an acknowledgment within **72 hours**, and a fix or status
update within **14 days** for confirmed issues. Credit is given in the release
notes unless you prefer to remain anonymous.

## Scope

In scope:

- The Express backend (`backend/`)
- The CLI (`cli/`)
- The React frontend (`frontend/`) — e.g. XSS in rendered API/mock responses
- Secret encryption at rest (`backend/src/utils/crypto.ts`)
- JWT handling and role enforcement (`ADMIN` / `MEMBER`)

Out of scope:

- Vulnerabilities that require a modified, attacker-controlled build of T0rdix
- Social engineering of local users
- The JSON file storage being *readable by the same local user* — this is by
  design (local-first, single-user machine trust model). Filesystem-level
  protections are the operating system's responsibility.

## Security model

T0rdix is designed to run **on your machine, for your machine**:

- **Secrets at rest** are encrypted with AES-256-GCM. The key comes from the
  `ENCRYPTION_KEY` environment variable (32 bytes, hex-encoded). If unset, a
  development key is derived from `JWT_SECRET` with `scrypt` and a console
  warning is printed. Set a real key before syncing anything you care about.
- **Passwords** are hashed with bcrypt (10 rounds). Plaintext passwords are
  never stored or logged.
- **Transport**: no secrets leave the machine unless you explicitly use
  `t0rdix secrets push` against a remote server URL. The CLI sends secrets over
  HTTPS when the server URL is HTTPS — plain HTTP is only expected for
  `localhost`.
- **JWTs** are signed (HS256) with `JWT_SECRET`, expire after 30 days, and are
  checked by every protected route. `ADMIN`-only routes check the role claim.
- **Secret values never appear in logs.** The activity log records the key
  name, version number and actor — never the value.
- **Rate limiting** is applied to authentication endpoints (default 20
  requests / minute / IP) to slow brute-force attempts.
- **Mock endpoints are public by design** — they simulate a real API. Do not
  put anything sensitive in mock responses and do not expose your T0rdix
  instance to the public internet.

## Hardening recommendations

1. Always set a strong `JWT_SECRET` and a dedicated `ENCRYPTION_KEY`.
2. Keep `CORS_ORIGIN` restricted to your frontend origin.
3. Do not run T0rdix on a shared host or expose port 5000 to a network you
   don't control. If you must, put it behind an authenticating reverse proxy.
4. Back up the `database/` folder — it contains your encrypted secrets.
5. Rotate `ENCRYPTION_KEY` by re-saving secrets (T0rdix re-encrypts on every
   secret write).

Thank you for helping keep T0rdix and its users safe. 🛡️
