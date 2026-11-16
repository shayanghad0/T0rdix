/**
 * T0rdix CLI — command wiring.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CliError, client, clearToken, loadToken, saveToken, serverUrl, setServerUrl } from "./client";

const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const PRIMARY = "\x1b[35m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function out(message: string): void {
  // eslint-disable-next-line no-console
  console.log(message);
}

function success(message: string): void {
  out(`${GREEN}✔${RESET} ${message}`);
}

function fail(message: string): void {
  out(`${RED}✖ ${message}${RESET}`);
}

function info(message: string): void {
  out(`${DIM}${message}${RESET}`);
}

function requireToken(): string {
  const token = loadToken();
  if (!token) {
    throw new CliError(1, "Not authenticated. Run `t0rdix login` first.");
  }
  return token;
}

interface ParsedArgs {
  _: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const _: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      _.push(arg);
    }
  }
  return { _, flags };
}

function ensureAuthed(): string {
  const token = requireToken();
  return token;
}

const HELP = `
${PRIMARY}t0rdix${RESET} — local-first developer workspace CLI

${DIM}USAGE${RESET}
  t0rdix <command> [options]

${DIM}COMMANDS${RESET}
  login                          Authenticate (email+password, or --token)
  logout                         Clear stored credentials
  whoami                         Show the signed-in identity + server
  server <url>                   Point the CLI at another T0rdix server
  projects                       List your workspace projects
  secrets pull                   Download secrets as .env (--env, --out, --project)
  secrets push                   Upsert a .env file (--file, --env, --project)
  secrets export                 Alias of secrets pull
  mock start                     Serve mock endpoints locally (--project, --port)
  mock routes                    List live mock routes (--project)
  api generate                   AI-scaffold an API from text (--project "<prompt>")
  openapi export                 Fetch the project's OpenAPI document (--project, --out)
  help                           Show this help

${DIM}EXAMPLES${RESET}
  t0rdix login
  t0rdix secrets pull --env development --out .env.development
  t0rdix secrets push --file .env.development --env development
  t0rdix mock start --project prj-saas-api --port 4000
  t0rdix api generate --project prj-saas-api "a blogging api with posts and comments"
`;

function pickProject(flagValue: string | boolean | undefined, projects: { id: string; name: string }[]): string {
  if (typeof flagValue === "string" && flagValue) return flagValue;
  if (projects.length === 0) {
    throw new CliError(1, "No projects found. Create one in the web app first.");
  }
  if (projects.length === 1) {
    info(`Using project: ${projects[0].name}`);
    return projects[0].id;
  }
  out("Multiple projects available — pass --project <id>:");
  for (const project of projects) out(`  ${CYAN}${project.id}${RESET}  ${project.name}`);
  throw new CliError(1, "Missing required option: --project <id>");
}

/** Parse KEY=value lines, ignoring comments and blanks. */
function parseDotenv(content: string): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    pairs.push({ key: line.slice(0, eq).trim(), value });
  }
  return pairs;
}

async function mockServe(projectId: string, port: number): Promise<void> {
  const http = await import("node:http");
  const { client: api } = await import("./client");
  const discovery = await api.mockDiscovery(projectId);

  const routes = discovery.apis.flatMap((api) =>
    api.endpoints.map((endpoint) => ({ ...endpoint, apiName: api.name })),
  );
  if (routes.length === 0) {
    throw new CliError(1, "This project has no mock endpoints yet.");
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ project: discovery.project, routes: routes.length }));
      return;
    }

    const match = routes.find((route) => {
      if (route.method !== req.method) return false;
      const pattern = route.path.split("/").filter(Boolean);
      if (pattern.length !== segments.length) return false;
      return pattern.every(
        (part, index) => part.startsWith(":") || part.toLowerCase() === segments[index].toLowerCase(),
      );
    });

    // Fetch the response through the main server's gateway (single source of truth).
    const gatewayUrl = `${serverUrl()}/api/mock/${projectId}${url.pathname}`;
    try {
      const upstream = await fetch(gatewayUrl, { method: req.method ?? "GET" });
      const text = await upstream.text();
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
      res.end(text);
    } catch {
      res.writeHead(502);
      res.end(JSON.stringify({ error: "UPSTREAM_UNREACHABLE", hint: "Is the T0rdix backend running on :5000?" }));
    }
    void match;
  });

  await new Promise<void>((resolve) => server.listen(port, () => resolve()));
  success(`Mock server for project ${projectId} → http://localhost:${port}`);
  info("Routes:");
  for (const route of routes) {
    out(`  ${CYAN}${route.method.padEnd(7)}${RESET} http://localhost:${port}${route.path}`);
  }
  info("Press Ctrl+C to stop.");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { _, flags } = parseArgs(argv);
  const command = _[0];

  if (!command || command === "help" || flags.help) {
    out(HELP);
    return;
  }

  try {
    switch (command) {
      case "login": {
        if (typeof flags.token === "string" && flags.token) {
          const user = (await client.me(flags.token)) as unknown as { email?: string };
          saveToken(flags.token);
          success(`Authenticated via token as ${user.email ?? "user"}`);
          info(`Token stored at ${path.join(os.homedir(), ".t0rdix", "token")}`);
          return;
        }

        const email = typeof flags.email === "string" ? flags.email : undefined;
        const password = typeof flags.password === "string" ? flags.password : undefined;

        out(`${PRIMARY}T0rdix login${RESET}`);
        const answers = await prompt([
          { key: "email", question: "Email", initial: email },
          { key: "password", question: "Password", initial: password, hidden: true },
        ]);
        const { token } = await client.loginWithEmail(answers.email, answers.password);
        saveToken(token);
        success(`Logged in as ${answers.email}`);
        return;
      }

      case "logout": {
        clearToken();
        success("Credentials cleared.");
        return;
      }

      case "whoami": {
        const token = ensureAuthed();
        const data = (await client.me(token)) as unknown as { email?: string };
        out(`  server  ${CYAN}${serverUrl()}${RESET}`);
        out(`  user    ${data.email ?? "unknown"}`);
        return;
      }

      case "server": {
        if (typeof _[1] === "string" && _[1]) {
          setServerUrl(_[1]);
          success(`Server set to ${_[1]}`);
        } else {
          out(`  current server: ${serverUrl()}`);
          out("  usage: t0rdix server <url>");
        }
        return;
      }

      case "projects": {
        ensureAuthed();
        const projects = await client.projects();
        if (projects.length === 0) {
          info("No projects yet.");
          return;
        }
        for (const project of projects) {
          out(`  ${CYAN}${project.id}${RESET}  ${project.name}${DIM} — ${project.description || "no description"}${RESET}`);
        }
        return;
      }

      case "secrets": {
        ensureAuthed();
        const sub = _[1] ?? "pull";
        const projects = await client.projects();
        const projectId = pickProject(flags.project, projects);
        const environment = (typeof flags.env === "string" ? flags.env : "development");

        if (sub === "pull" || sub === "export") {
          const content = await client.exportDotenv(projectId, environment);
          const target = (typeof flags.out === "string" ? flags.out : `.env.${environment}`);
          fs.writeFileSync(target, content, "utf8");
          success(`Pulled ${environment} → ${target}`);
          info("Decrypted values were written locally — add it to .gitignore.");
          return;
        }

        if (sub === "push") {
          const file = (typeof flags.file === "string" ? flags.file : `.env.${environment}`);
          if (!fs.existsSync(file)) {
            throw new CliError(1, `File not found: ${file}`);
          }
          const pairs = parseDotenv(fs.readFileSync(file, "utf8"));
          if (pairs.length === 0) {
            throw new CliError(1, "No KEY=value pairs found in the file.");
          }
          const result = await client.bulkPush(
            projectId,
            pairs.map((pair) => ({ ...pair, environment })),
          );
          success(`Pushed ${pairs.length} keys → ${environment}`);
          out(`  created: ${GREEN}${result.created}${RESET}  updated: ${GREEN}${result.updated}${RESET}`);
          return;
        }

        throw new CliError(1, `Unknown secrets subcommand "${sub}" — use pull or push.`);
      }

      case "mock": {
        ensureAuthed();
        const sub = _[1] ?? "routes";
        const projects = await client.projects();
        const projectId = pickProject(flags.project, projects);

        if (sub === "start") {
          const port = Number.parseInt(typeof flags.port === "string" ? flags.port : "4000", 10) || 4000;
          await mockServe(projectId, port);
          return;
        }

        if (sub === "routes") {
          const discovery = await client.mockDiscovery(projectId);
          out(`  ${PRIMARY}${discovery.project.name}${RESET}`);
          for (const api of discovery.apis) {
            out(`  ${api.name}:`);
            for (const endpoint of api.endpoints) {
              out(`    ${CYAN}${endpoint.method.padEnd(7)}${RESET} ${endpoint.path}  ${DIM}${endpoint.status}${RESET}`);
            }
          }
          return;
        }

        throw new CliError(1, `Unknown mock subcommand "${sub}".`);
      }

      case "api": {
        ensureAuthed();
        const sub = _[1] ?? "generate";
        if (sub !== "generate") {
          throw new CliError(1, `Unknown api subcommand "${sub}".`);
        }
        const projects = await client.projects();
        const projectId = pickProject(flags.project, projects);
        const promptText = _.slice(2).join(" ") || (typeof flags.prompt === "string" ? flags.prompt : "");
        if (!promptText) {
          throw new CliError(1, 'Provide a description: t0rdix api generate --project <id> "a blogging api"');
        }
        const result = await client.generateApiFromText(projectId, promptText);
        success(`API created: ${result.spec.name}`);
        out(`  endpoints: ${result.spec.endpoints.length}${result.createdApiId ? "" : " (dry-run)"}`);
        for (const endpoint of result.spec.endpoints.slice(0, 8)) {
          const typed = endpoint as { method: string; path: string };
          out(`    ${CYAN}${typed.method.padEnd(7)}${RESET} ${typed.path}`);
        }
        return;
      }

      case "openapi": {
        ensureAuthed();
        const sub = _[1] ?? "export";
        if (sub !== "export") {
          throw new CliError(1, `Unknown openapi subcommand "${sub}".`);
        }
        const projects = await client.projects();
        const projectId = pickProject(flags.project, projects);
        const token = requireToken();
        const response = await fetch(`${serverUrl()}/api/projects/${projectId}/openapi`, {
          headers: { authorization: `Bearer ${token}` },
        });
        const document = await response.text();
        const target = (typeof flags.out === "string" ? flags.out : "openapi.json");
        fs.writeFileSync(target, document, "utf8");
        success(`OpenAPI document written to ${target}`);
        return;
      }

      default:
        throw new CliError(1, `Unknown command "${command}" — try \`t0rdix help\`.`);
    }
  } catch (error) {
    if (error instanceof CliError) {
      fail(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

/** Minimal dependency-free prompt (single hidden/plain question). */
function prompt(questions: { key: string; question: string; initial?: string; hidden?: boolean }[]): Promise<Record<string, string>> {
  const readline = require("node:readline") as typeof import("node:readline");
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answers: Record<string, string> = {};
    let index = 0;

    const askNext = () => {
      if (index >= questions.length) {
        rl.close();
        resolve(answers);
        return;
      }
      const question = questions[index];
      const suffix = question.initial ? ` (${question.initial})` : "";
      rl.question(`${question.question}${suffix}: `, (answer: string) => {
        answers[question.key] = answer || question.initial || "";
        index += 1;
        askNext();
      });
      if (question.hidden) {
        // Best-effort muting on TTYs.
        (rl as unknown as { stdout: { mute?: () => void } }).stdout?.mute?.();
      }
    };

    askNext();
  });
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
