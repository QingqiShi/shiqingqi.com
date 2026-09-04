import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { FullResult, Reporter } from "@playwright/test/reporter";

const logPath = join(__dirname, ".web-server-errors.log");

/**
 * Fails the run if web-server-with-error-log.mjs logged a server error
 * during this run. What counts as an error is decided entirely by that
 * wrapper script; this reporter only checks whether it wrote anything.
 */
export default class WebServerErrorReporter implements Reporter {
  private configLoadedAt: number;

  constructor(options: { configLoadedAt?: number }) {
    this.configLoadedAt = options.configLoadedAt ?? 0;
  }

  // Reporter#onEnd must return `Promise<...> | void`; a bare status object
  // fails the type check, so the override is wrapped at the final return.
  onEnd(): Promise<{ status?: FullResult["status"] }> | undefined {
    if (!existsSync(logPath)) return;

    // A run with reuseExistingServer never launches the wrapper, so a log
    // left over from an earlier run must not fail this one. The wrapper
    // truncates the log after the config loads, so errors written during
    // server startup are correctly newer than configLoadedAt.
    if (statSync(logPath).mtimeMs < this.configLoadedAt) return;

    const errors = readFileSync(logPath, "utf8");
    if (!errors.trim()) return;

    console.error(
      [
        "",
        "=".repeat(80),
        "Web server logged errors during this run:",
        "=".repeat(80),
        errors.trimEnd(),
        "=".repeat(80),
        "",
      ].join("\n"),
    );

    return Promise.resolve({ status: "failed" });
  }
}
