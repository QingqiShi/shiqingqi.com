import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { FINANCE_MIGRATIONS_FOLDER } from "../finance-migrations-folder.ts";
import { servePglite } from "./serve-pglite.ts";

export const DEV_DB_DIR = path.resolve(
  import.meta.dirname,
  "../../../../.finance-db",
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
    migrationsFolder: FINANCE_MIGRATIONS_FOLDER,
  });
  const server = await servePglite(client, { host: "127.0.0.1", port });
  return {
    close: async () => {
      await server.close();
      await client.close();
    },
  };
}
