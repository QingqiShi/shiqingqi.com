import fs from "node:fs";
import path from "node:path";

/**
 * Write `content` to `filePath` only when it differs from what is on disk,
 * through an atomic rename.
 *
 * A generator runs beside a live dev server, which must never read a
 * truncated or half-written file: a bundle caught mid-write is read as an
 * empty one, and the app then reports every key in it as missing. An
 * unchanged file also keeps its mtime, so nothing downstream rebuilds for no
 * reason.
 *
 * @returns whether the file was written.
 */
export function writeFileSyncIfChanged(
  filePath: string,
  content: string,
): boolean {
  try {
    if (fs.readFileSync(filePath, "utf8") === content) return false;
  } catch {
    // File missing or unreadable — fall through and write it.
  }
  const temporaryPath = `${filePath}.${String(process.pid)}.tmp`;
  fs.writeFileSync(temporaryPath, content, "utf8");
  fs.renameSync(temporaryPath, filePath);
  return true;
}

/**
 * Delete every file in `dir` that this run did not write, so an output the
 * generator no longer produces does not linger. Subdirectories are left alone.
 *
 * @returns the names of the files that were removed.
 */
export function cleanStaleFiles(
  dir: string,
  keep: ReadonlySet<string>,
): string[] {
  const removed: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || keep.has(entry.name)) continue;
    fs.unlinkSync(path.join(dir, entry.name));
    removed.push(entry.name);
  }
  return removed;
}
