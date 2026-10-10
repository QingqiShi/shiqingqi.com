import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readBackup } from "./read-backup.ts";
import {
  createFixtureStore,
  FIXTURE_MANIFEST,
} from "./testing/create-fixture-store.ts";
import { createStoredZip } from "./testing/create-stored-zip.ts";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "read-backup-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeBackup(manifest: object) {
  const storePath = path.join(dir, "store.sqlite");
  const db = createFixtureStore(storePath, { writeAheadLog: true });
  const store = await readFile(storePath);
  const wal = await readFile(`${storePath}-wal`);
  db.close();
  const zipPath = path.join(dir, "backup.zip");
  await writeFile(
    zipPath,
    createStoredZip({
      "MoneyThingsBackup/metadata/manifest.json": Buffer.from(
        JSON.stringify(manifest),
      ),
      "MoneyThingsBackup/data/moneythings.sqlite": store,
      "MoneyThingsBackup/data/moneythings.sqlite-wal": wal,
    }),
  );
  return zipPath;
}

describe("readBackup", () => {
  it("reads the rows that are only in the write-ahead log", async () => {
    const zipPath = await writeBackup(FIXTURE_MANIFEST);
    const source = await readBackup(zipPath, { workDir: dir });
    expect(source.manifest).toEqual(FIXTURE_MANIFEST);
    expect(source.sceneName).toBe("Home");
    expect(source.transactions.length).toBeGreaterThan(10);
    expect(source.accounts.map((a) => a.name)).toContain("老公 Bank");
    expect(
      source.transactions.find((t) => t.id === "TX-AFTER")?.tagIds,
    ).toEqual(["TAG-RESTAURANT", "TAG-DELIVERY"]);
  });

  it("rejects a backup in another format", async () => {
    const zipPath = await writeBackup({ ...FIXTURE_MANIFEST, version: 3 });
    await expect(readBackup(zipPath, { workDir: dir })).rejects.toThrow(
      /Unsupported backup/,
    );
  });
});
