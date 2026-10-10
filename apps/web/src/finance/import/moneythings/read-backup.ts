import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { readSourceRows } from "./read-source-rows.ts";
import type { SourceData, SourceManifest } from "./types.ts";
import { unzipEntries } from "./unzip-entries.ts";

const MANIFEST_FORMAT = "com.lishaohui.moneythings.full-backup";
const MANIFEST_VERSION = 2;
const MANIFEST = "metadata/manifest.json";
const STORE = "data/moneythings.sqlite";
const STORE_WAL = `${STORE}-wal`;

function parseManifest(text: string): SourceManifest {
  const value: unknown = JSON.parse(text);
  if (
    typeof value === "object" &&
    value !== null &&
    "format" in value &&
    "version" in value &&
    "createdAt" in value &&
    typeof value.format === "string" &&
    typeof value.version === "number" &&
    typeof value.createdAt === "string"
  ) {
    return {
      format: value.format,
      version: value.version,
      createdAt: value.createdAt,
    };
  }
  throw new Error("The backup manifest is not valid");
}

/** Throws unless the manifest is a MoneyThings full backup in format 2. */
function assertManifest(manifest: SourceManifest) {
  if (
    manifest.format !== MANIFEST_FORMAT ||
    manifest.version !== MANIFEST_VERSION
  ) {
    throw new Error(
      `Unsupported backup: ${manifest.format} v${String(manifest.version)} (expected ${MANIFEST_FORMAT} v${String(MANIFEST_VERSION)})`,
    );
  }
}

function entryNamed(files: Map<string, Buffer>, suffix: string) {
  for (const [name, data] of files) {
    if (name === suffix || name.endsWith(`/${suffix}`)) return data;
  }
  return undefined;
}

/**
 * Reads a MoneyThings backup zip. The store and its write-ahead log go to a
 * temporary directory, and SQLite applies the log when it opens the store,
 * because the newest rows are only in the log.
 */
export async function readBackup(
  zipPath: string,
  options: { workDir?: string } = {},
): Promise<SourceData> {
  const files = unzipEntries(await readFile(zipPath), (name) =>
    [MANIFEST, STORE, STORE_WAL].some(
      (suffix) => name === suffix || name.endsWith(`/${suffix}`),
    ),
  );
  const manifestData = entryNamed(files, MANIFEST);
  const store = entryNamed(files, STORE);
  if (!manifestData || !store) {
    throw new Error(`${zipPath} is not a MoneyThings backup`);
  }
  const manifest = parseManifest(manifestData.toString("utf8"));
  assertManifest(manifest);

  const dir = await mkdtemp(
    path.join(options.workDir ?? tmpdir(), "moneythings-"),
  );
  try {
    const storePath = path.join(dir, "moneythings.sqlite");
    await writeFile(storePath, store);
    const wal = entryNamed(files, STORE_WAL);
    if (wal) await writeFile(`${storePath}-wal`, wal);
    const db = new DatabaseSync(storePath);
    try {
      return readSourceRows(db, manifest);
    } finally {
      db.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
