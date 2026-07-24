import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The script lives at `<checkout-root>/scripts/worktree-port.mjs`, so the
// checkout root is one directory up — whatever cwd or shell invoked it.
const scriptDir = dirname(fileURLToPath(import.meta.url));

/**
 * Deterministic dev-server port for the current git worktree.
 *
 * The main checkout keeps port 3000; each worktree gets a stable port hashed
 * from its folder name (3001–3999), so the dev server, Playwright, and the
 * session hook all agree without any shared state. Detection reads the `.git`
 * entry directly — a worktree's is a FILE, the main checkout's a DIRECTORY —
 * so the port no longer depends on `$ORCA_WORKTREE_ID`, whose absence in a
 * plain `pnpm dev` shell is what used to send `pnpm dev` and the hook to
 * different ports. Submodule / `--separate-git-dir` checkouts (a `.git` file
 * whose git dir lacks the `commondir` marker) stay on 3000.
 *
 * `offset` lets a second app (e.g. `apps/trip-planner`) run alongside `web`
 * under one `turbo dev` — `web` uses 0, the second a non-zero offset.
 */
export function getWorktreePort(offset = 0) {
  const mainPort = 3000 + offset;
  const root = dirname(scriptDir);

  // Main checkout: `.git` is a directory, so the read throws (as when `.git`
  // is missing) → default port.
  let dotGit;
  try {
    dotGit = readFileSync(join(root, ".git"), "utf8");
  } catch {
    return mainPort;
  }

  // Worktree: `.git` file → an admin dir git marks with `commondir`. A
  // submodule / `--separate-git-dir` git dir has no `commondir` → main port.
  const gitdir = dotGit.match(/^gitdir:\s*(.+?)\s*$/m)?.[1];
  if (!gitdir) return mainPort;
  if (!existsSync(join(resolve(root, gitdir), "commondir"))) return mainPort;

  return portForName(basename(root), offset);
}

function portForName(name, offset) {
  let hash = 5381;
  for (const char of name) {
    hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  }
  return 3001 + (hash % 999) + offset; // 3001–3999 (+offset), stable per worktree
}

// CLI mode: print the port when run directly. Resolve the entry path's symlinks
// (Node already resolved import.meta.url) so a symlinked invocation still
// matches; fall back to a plain absolute path if realpath fails so a filesystem
// hiccup can't leave `-p $(…)` empty.
const entryPath = process.argv[1];
if (entryPath) {
  let resolvedEntry;
  try {
    resolvedEntry = realpathSync(entryPath);
  } catch {
    resolvedEntry = resolve(entryPath);
  }
  if (resolvedEntry === fileURLToPath(import.meta.url)) {
    const offset = Number.parseInt(process.argv[2] ?? "0", 10) || 0;
    process.stdout.write(String(getWorktreePort(offset)));
  }
}
