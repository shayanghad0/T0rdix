#!/usr/bin/env node
/**
 * T0rdix dev orchestrator.
 *
 * Runs the backend API (:5000) and the Vite frontend (:5173) together in one
 * terminal with labeled, colorized output. If either process exits, the other
 * is stopped too. Ctrl+C stops everything.
 *
 * Before spawning, listener processes left behind by an earlier crashed dev
 * session are killed on the dev ports, so you don't get EADDRINUSE from stale
 * `tsx watch` / vite orphans. Opt out with T0RDIX_DEV_NO_CLEAN=1.
 *
 * Zero dependencies — Node built-ins only (cross-platform: Windows/Unix).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";

const TASKS = [
  { name: "api", color: "\x1b[35m", command: "npm --prefix backend run dev" },
  { name: "web", color: "\x1b[36m", command: "npm --prefix frontend run dev" },
];

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];
let stopping = false;
let exitCode = 0;

/* -------------------------------------------------------------------------
 * Pre-flight: free the dev ports from leftover listener processes.
 *
 * Ports are resolved the same way the backend does it (PORT env →
 * backend/.env → root .env → default 5000); the Vite port is fixed in
 * frontend/vite.config.ts. Only genuinely listening PIDs are killed — never
 * this script itself or its parent shell.
 * ---------------------------------------------------------------------- */

function devNote(message) {
  process.stderr.write(`${YELLOW}[dev]${RESET} ${message}\n`);
}

/** Read PORT from a dotenv-style file, if it exists. */
function readPortFromEnvFile(file) {
  try {
    const match = fs.readFileSync(file, "utf8").match(/^\s*PORT\s*=\s*["']?(\d+)["']?\s*(?:#.*)?$/m);
    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function resolveApiPort() {
  const explicit = Number.parseInt(process.env.PORT ?? "", 10);
  if (Number.isFinite(explicit)) return explicit;
  // Same precedence as backend/src/config/env.ts.
  return readPortFromEnvFile(path.resolve("backend/.env")) ?? readPortFromEnvFile(path.resolve(".env")) ?? 5000;
}

const API_PORT = resolveApiPort();
const WEB_PORT = 5173; // keep in sync with frontend/vite.config.ts

function skipPid(pid) {
  return !Number.isFinite(pid) || pid <= 0 || pid === process.pid || pid === process.ppid;
}

/** Windows: parse `netstat -ano -p tcp` for LISTENING sockets on our ports. */
function staleListenersOnWindows(ports) {
  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", windowsHide: true });
  const byPid = new Map();
  for (const line of (result.stdout ?? "").split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[3] !== "LISTENING") continue;
    const port = Number(cols[1].split(":").pop());
    const pid = Number(cols[4]);
    if (!ports.includes(port) || skipPid(pid) || byPid.has(pid)) continue;
    byPid.set(pid, port);
  }
  return [...byPid].map(([pid, port]) => ({ pid, port }));
}

/** Unix: ask lsof which PIDs listen on each port (skipped if unavailable). */
function staleListenersOnPosix(ports) {
  const byPid = new Map();
  for (const port of ports) {
    const result = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
    if (!result.stdout) continue;
    for (const token of result.stdout.split(/\s+/)) {
      const pid = Number(token);
      if (skipPid(pid) || byPid.has(pid)) continue;
      byPid.set(pid, port);
    }
  }
  return [...byPid].map(([pid, port]) => ({ pid, port }));
}

function cleanStaleListeners() {
  if (process.env.T0RDIX_DEV_NO_CLEAN === "1") {
    devNote("stale-port cleanup disabled via T0RDIX_DEV_NO_CLEAN=1 — skipping.");
    return;
  }
  const ports = [...new Set([API_PORT, WEB_PORT])];
  const stale =
    process.platform === "win32" ? staleListenersOnWindows(ports) : staleListenersOnPosix(ports);
  if (stale.length === 0) return;
  devNote("freeing dev ports from leftovers of a previous run …");
  for (const { port, pid } of stale) {
    devNote(`port ${port} is held by stale PID ${pid} — killing it first.`);
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
      } else {
        process.kill(pid, "SIGKILL");
      }
    } catch {
      /* already gone */
    }
  }
}

/**
 * Stream a child's stdout/stderr through a colored `[label]` prefix.
 */
function pipe(source, label, color, target) {
  source.setEncoding("utf8");
  let buffer = "";
  source.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) target.write(`${color}[${label}]${RESET} ${line}\n`);
  });
  source.on("end", () => {
    if (buffer) target.write(`${color}[${label}]${RESET} ${buffer}\n`);
  });
}

/** Kill a spawned (shell-wrapped) process tree on any platform. */
function kill(child) {
  if (!child.pid || child.killed) return;
  try {
    if (process.platform === "win32") {
      // shell:true wraps the command in cmd.exe — kill the whole tree.
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    /* already gone */
  }
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code ?? exitCode;
  for (const child of children) kill(child);
  // Give taskkill a beat to finish on Windows, then leave.
  setTimeout(() => process.exit(exitCode), 400);
}

function start(task) {
  const child = spawn(task.command, [], {
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "1" },
    windowsHide: true,
  });
  pipe(child.stdout, task.name, task.color, process.stdout);
  pipe(child.stderr, task.name, task.color, process.stderr);
  children.push(child);

  child.on("exit", (code) => {
    if (stopping) return;
    // One service stopped (crash or Ctrl+C at the child) — stop the other.
    process.stderr.write(`\x1b[33m[dev]\x1b[0m ${task.name} exited (code ${code ?? 0}) — shutting down.\n`);
    shutdown(code === 0 ? 0 : 1);
  });
}

cleanStaleListeners();

for (const task of TASKS) start(task);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => {
  for (const child of children) kill(child);
});
