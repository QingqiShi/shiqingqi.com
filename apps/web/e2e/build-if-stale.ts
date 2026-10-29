import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const appDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(appDir, "../..");
/* `next build` deletes everything in `.next` except its cache, so any other
 * build also deletes this stamp. */
const stampPath = path.join(appDir, ".next/e2e-build-stamp");

/* The build does not read the excluded files. */
const sourcePathspec = [
  ".",
  ":(exclude,glob)**/e2e/**",
  ":(exclude,glob)**/*.test.ts",
  ":(exclude,glob)**/*.test.tsx",
  ":(exclude,glob)**/*.test.mjs",
  ":(exclude,glob)**/*.eval.ts",
  ":(exclude,glob)*.md",
  ":(exclude)apps/finance",
  ":(exclude)apps/trip-planner",
  ":(exclude).claude",
  ":(exclude).github",
];

function git(args: string[], input?: string): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
}

function listFiles(options: string[]): string[] {
  return git(["ls-files", "-z", ...options, "--", ...sourcePathspec])
    .split("\0")
    .filter((entry) => entry !== "");
}

/** The object ID of each source file as it is in the working tree. */
function sourceObjects(): Map<string, string> {
  const objects = new Map<string, string>();
  for (const entry of listFiles(["--stage"])) {
    const [info, file] = entry.split("\t");
    objects.set(file, info.split(" ")[1]);
  }
  const changed = listFiles(["--modified", "--others", "--exclude-standard"]);
  const present = changed.filter((file) => {
    objects.delete(file);
    return existsSync(path.join(repoRoot, file));
  });
  if (present.length > 0) {
    const ids = git(["hash-object", "--stdin-paths"], present.join("\n"));
    ids
      .trim()
      .split("\n")
      .forEach((id, index) => objects.set(present[index], id));
  }
  return objects;
}

/** A hash of the working tree's source files and of the build settings. */
function sourceFingerprint(env: NodeJS.ProcessEnv): string {
  const hash = createHash("sha256");
  for (const [file, id] of [...sourceObjects()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    hash.update(`${file}\0${id}\n`);
  }
  for (const file of readdirSync(appDir).filter((name) =>
    name.startsWith(".env"),
  )) {
    hash.update(file);
    hash.update(readFileSync(path.join(appDir, file)));
  }
  const publicEnv = Object.entries(env)
    .filter(([name]) => name.startsWith("NEXT_PUBLIC_"))
    .sort(([a], [b]) => a.localeCompare(b));
  hash.update(JSON.stringify([process.version, publicEnv]));
  return hash.digest("hex");
}

/** Runs `pnpm build` with `env`, unless the last build was of the same sources. */
export async function buildIfStale(env: NodeJS.ProcessEnv): Promise<void> {
  const fingerprint = sourceFingerprint(env);
  if (
    existsSync(stampPath) &&
    readFileSync(stampPath, "utf8") === fingerprint
  ) {
    // Playwright shows only stderr of its web server.
    console.error(
      "e2e: no source changed since the last build, so it is used again.",
    );
    return;
  }
  const code = await new Promise<number | null>((resolve) => {
    spawn("pnpm", ["build"], { cwd: appDir, env, stdio: "inherit" }).once(
      "exit",
      resolve,
    );
  });
  if (code !== 0) throw new Error(`pnpm build failed with ${String(code)}.`);
  writeFileSync(stampPath, fingerprint);
}
