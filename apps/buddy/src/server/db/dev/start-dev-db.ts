import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { servePglite } from "@tuja/dev-tools/serve-pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { BUDDY_MIGRATIONS_FOLDER } from "../buddy-migrations-folder.ts";

export const DEV_DB_DIR = path.resolve(
  import.meta.dirname,
  "../../../../.buddy-db",
);

export interface DevDb {
  close: () => Promise<void>;
}

/** Without `dataDir`, the database is in memory. */
export async function startDevDb({
  port,
  dataDir,
}: {
  port: number;
  dataDir?: string;
}): Promise<DevDb> {
  const client = await PGlite.create(dataDir);
  await migrate(drizzle({ client }), {
    migrationsFolder: BUDDY_MIGRATIONS_FOLDER,
  });
  const server = await servePglite(client, { host: "127.0.0.1", port });
  return {
    close: async () => {
      await server.close();
      await client.close();
    },
  };
}
