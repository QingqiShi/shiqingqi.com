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
 */
export function getWorktreePort() {
  let root;
  try {
    root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  } catch {
    return 3000;
  }

  if (!root.includes("/.claude/worktrees/")) return 3000;

  const name = basename(root);
  let hash = 5381;
  for (const char of name) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return 3001 + (hash % 999); // 3001–3999, stable per worktree
}

// CLI mode: `node scripts/worktree-port.mjs` prints the port number.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(String(getWorktreePort()));
}
