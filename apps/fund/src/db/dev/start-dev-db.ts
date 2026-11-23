import { PGlite } from "@electric-sql/pglite";
import { servePglite } from "@tuja/dev-tools/serve-pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { FUND_MIGRATIONS_FOLDER } from "../fund-migrations-folder.ts";

/** Without `dataDir`, the database is in memory. */
export async function startDevDb({
  port,
  dataDir,
}: {
  port: number;
  dataDir?: string;
}) {
  const client = await PGlite.create(dataDir);
  await migrate(drizzle({ client }), {
    migrationsFolder: FUND_MIGRATIONS_FOLDER,
  });
  const server = await servePglite(client, { host: "127.0.0.1", port });
  return {
    close: async () => {
      await server.close();
      await client.close();
    },
  };
}
