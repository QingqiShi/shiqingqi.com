import path from "node:path";
import { parseArgs } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { FINANCE_MIGRATIONS_FOLDER } from "../finance-migrations-folder.ts";
import { servePglite } from "./serve-pglite.ts";

async function serveDevDb() {
  const { values } = parseArgs({
    options: {
      port: { type: "string", default: "5433" },
      memory: { type: "boolean", default: false },
    },
  });

  const port = Number(values.port);
  const dataDir = values.memory
    ? undefined
    : path.resolve(import.meta.dirname, "../../../../.finance-db");

  const client = await PGlite.create(dataDir);
  await migrate(drizzle({ client }), {
    migrationsFolder: FINANCE_MIGRATIONS_FOLDER,
  });

  const server = await servePglite(client, { host: "127.0.0.1", port });

  console.log(`Finance dev database: ${dataDir ?? "in memory"}`);
  console.log(
    `FINANCE_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${String(port)}/postgres`,
  );

  async function stop() {
    await server.close();
    await client.close();
    process.exit(0);
  }

  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
}

void serveDevDb();
