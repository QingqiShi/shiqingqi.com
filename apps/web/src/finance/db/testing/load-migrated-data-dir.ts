import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "../finance-migrations-folder.ts";

const WEB_FOLDER = path.dirname(FINANCE_MIGRATIONS_FOLDER);
const CACHE_FOLDER = path.join(
  WEB_FOLDER,
  "node_modules",
  ".cache",
  "finance-test-db",
);

const packageSchema = z.object({ version: z.string() }).loose();

async function packageVersion(name: string) {
  const file = path.join(WEB_FOLDER, "node_modules", name, "package.json");
  return packageSchema.parse(JSON.parse(await readFile(file, "utf8"))).version;
}

/** Changes when the migrations or the packages that apply and dump them change. */
async function schemaKey() {
  const hash = createHash("sha256");
  for (const name of ["@electric-sql/pglite", "drizzle-orm"]) {
    hash.update(`${name}@${await packageVersion(name)}\0`);
  }
  const files = (
    await readdir(FINANCE_MIGRATIONS_FOLDER, {
      recursive: true,
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(
        FINANCE_MIGRATIONS_FOLDER,
        path.join(entry.parentPath, entry.name),
      ),
    )
    .sort();
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(await readFile(path.join(FINANCE_MIGRATIONS_FOLDER, file)));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}

async function migrateNewDataDir() {
  const client = new PGlite();
  await migrate(drizzle({ client }), {
    migrationsFolder: FINANCE_MIGRATIONS_FOLDER,
  });
  const dataDir = await client.dumpDataDir("none");
  await client.close();
  return dataDir;
}

function isMissing(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * The data directory of an empty, migrated database. It is cached in
 * `node_modules/.cache`, so only the first run after a migration changes pays
 * for the migrations.
 */
export async function loadMigratedDataDir(): Promise<Blob> {
  const file = path.join(CACHE_FOLDER, `${await schemaKey()}.tar`);
  try {
    return new Blob([await readFile(file)]);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  const dataDir = await migrateNewDataDir();
  await mkdir(CACHE_FOLDER, { recursive: true });
  // Other test workers can write the same file at the same time. Write a file
  // with a unique name and then rename it, because a rename replaces the file
  // in one step.
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, new Uint8Array(await dataDir.arrayBuffer()));
  await rename(temporary, file);
  for (const stale of await readdir(CACHE_FOLDER)) {
    if (stale.endsWith(".tar") && stale !== path.basename(file)) {
      await rm(path.join(CACHE_FOLDER, stale), { force: true });
    }
  }
  return dataDir;
}
