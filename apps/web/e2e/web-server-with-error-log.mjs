#!/usr/bin/env node
// Playwright's webServer only checks that the port comes up; a server
// error mid-test (e.g. an unhandled SSR exception) never fails the run
// on its own. This wrapper runs the real start command, forwards its
// output unchanged so Playwright's [WebServer] log still shows
// everything, and also copies matched error lines into a log file that
// web-server-error-reporter.ts checks once the run ends.
import { spawn } from "node:child_process";
import { writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const logPath = join(
  dirname(fileURLToPath(import.meta.url)),
  ".web-server-errors.log",
);

// Next.js prints its own errors with a red "⨯"; unhandled rejections and
// uncaught exceptions carry those literal marker strings.
const ERROR_MARKERS = [/⨯/, /unhandledRejection/i, /uncaughtException/i];
// Next.js logs this error when a test closes its page while the server
// still streams the response. It is a client disconnect, not an app
// failure, so it must not fail the run.
const IGNORED_ERRORS = [/The destination stream closed early/];
const isErrorLine = (line) =>
  ERROR_MARKERS.some((marker) => marker.test(line)) &&
  !IGNORED_ERRORS.some((ignored) => ignored.test(line));
// Stack frames and error context printed below a matched line are
// indented; that is how a multi-line error is told apart from whatever
// unrelated output comes next.
const isContinuationLine = (line) => /^[ \t]/.test(line);

writeFileSync(logPath, "");

/** Pipe `source` to `dest` unchanged, and copy matched error blocks to the log file. */
function relay(source, dest) {
  let buffered = "";
  let capturing = false;
  source.on("data", (chunk) => {
    dest.write(chunk);
    buffered += chunk;
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      if (isErrorLine(line)) {
        capturing = true;
        appendFileSync(logPath, line + "\n");
      } else if (capturing && isContinuationLine(line)) {
        appendFileSync(logPath, line + "\n");
      } else {
        capturing = false;
      }
    }
  });
}

const child = spawn("pnpm start", {
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});
relay(child.stdout, process.stdout);
relay(child.stderr, process.stderr);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
