import { parseArgs } from "node:util";
import { localFinanceDatabaseUrl } from "../../dev/build-local-finance-env.ts";
import { DEV_DB_DIR, startDevDb } from "./start-dev-db.ts";

async function serveDevDb() {
  const { values } = parseArgs({
    options: {
      port: { type: "string", default: "5433" },
      memory: { type: "boolean", default: false },
    },
  });

  const port = Number(values.port);
  const dataDir = values.memory ? undefined : DEV_DB_DIR;
  const db = await startDevDb({ port, dataDir });

  console.log(`Finance dev database: ${dataDir ?? "in memory"}`);
  console.log(`FINANCE_DATABASE_URL=${localFinanceDatabaseUrl(port)}`);

  async function stop() {
    await db.close();
    process.exit(0);
  }

  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
}

void serveDevDb();
