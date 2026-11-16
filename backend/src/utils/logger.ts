/**
 * Minimal dependency-free console logger with subtle ANSI colors.
 */
const COLORS = {
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  success: "\x1b[32m", // green
  reset: "\x1b[0m",
  dim: "\x1b[2m",
};

function line(level: keyof typeof COLORS, ...args: unknown[]): void {
  const color = COLORS[level] ?? COLORS.info;
  const stamp = new Date().toLocaleTimeString("en-GB");
  // eslint-disable-next-line no-console
  console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
    `${COLORS.dim}[${stamp}]${COLORS.reset} ${color}${level.toUpperCase()}${COLORS.reset}`,
    ...args,
  );
}

export const logger = {
  info: (...args: unknown[]) => line("info", ...args),
  warn: (...args: unknown[]) => line("warn", ...args),
  error: (...args: unknown[]) => line("error", ...args),
  success: (...args: unknown[]) => line("success", ...args),
};
