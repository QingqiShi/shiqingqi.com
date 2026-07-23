import { execSync } from "node:child_process";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Deterministic dev-server port for the current git worktree.
 *
 * The main checkout always keeps the standard port 3000. Worktrees get a
 * stable port derived from their folder name (djb2 hash mapped into
 * 3001–3999), so the dev server, Playwright, and the agent all agree on the
 * same port without any shared state to write or read. A worktree is detected
 * two ways: an Orca worktree exposes `$ORCA_WORKTREE_ID` (formatted as
 * `<uuid>::<path>`), and a Claude Code worktree lives under
 * `.claude/worktrees/<name>`.
 *
 * An optional `offset` shifts the result by a fixed amount. This lets a
 * second app in the monorepo (e.g. `apps/trip-planner`) run alongside `web`
 * under a single `turbo dev` without colliding on the same port — `web` uses
 * offset 0, the second app passes a non-zero offset.
 */
export function getWorktreePort(offset = 0) {
  // Orca worktrees expose `<uuid>::<path>` via ORCA_WORKTREE_ID; the path
  // after the first `::` identifies the worktree, so no git call is needed.
  const orcaWorktreeId = process.env.ORCA_WORKTREE_ID;
  if (orcaWorktreeId) {
    const separator = orcaWorktreeId.indexOf("::");
    const worktreePath =
      separator === -1 ? orcaWorktreeId : orcaWorktreeId.slice(separator + 2);
    return portForName(basename(worktreePath), offset);
  }

  let root;
  try {
    root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
  } catch {
    return 3000 + offset;
  }

  if (!root.includes("/.claude/worktrees/")) return 3000 + offset;

  return portForName(basename(root), offset);
}

function portForName(name, offset) {
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
