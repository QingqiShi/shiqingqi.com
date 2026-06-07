import { execSync } from "node:child_process";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Deterministic dev-server port for the current git worktree.
 *
 * The main checkout always keeps the standard port 3000. Each worktree
 * created under `.claude/worktrees/<name>` gets a stable port derived from
 * its folder name (djb2 hash mapped into 3001–3999), so the dev server,
 * Playwright, and the agent all agree on the same port without any shared
 * state to write or read.
 *
 * An optional `offset` shifts the result by a fixed amount. This lets a
 * second app in the monorepo (e.g. `apps/trip-planner`) run alongside `web`
 * under a single `turbo dev` without colliding on the same port — `web` uses
 * offset 0, the second app passes a non-zero offset.
 */
export function getWorktreePort(offset = 0) {
  let root;
  try {
    root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  } catch {
    return 3000 + offset;
  }

  if (!root.includes("/.claude/worktrees/")) return 3000 + offset;

  const name = basename(root);
  let hash = 5381;
  for (const char of name) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return 3001 + (hash % 999) + offset; // 3001–3999 (+offset), stable per worktree
}

// CLI mode: `node scripts/worktree-port.mjs [offset]` prints the port number.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const offset = Number.parseInt(process.argv[2] ?? "0", 10) || 0;
  process.stdout.write(String(getWorktreePort(offset)));
}
