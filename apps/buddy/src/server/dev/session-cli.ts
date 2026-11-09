import {
  readCliOptions,
  readPortOption,
} from "@tuja/dev-tools/read-cli-options";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { buddySessionCookie } from "../auth/buddy-session-cookie.ts";
import { createSession } from "../auth/create-session.ts";
import { accounts, schema } from "../db/schema.ts";
import { assertLocalDatabaseUrl } from "./assert-local-database-url.ts";
import { readDevBuddyEnv } from "./read-dev-buddy-env.ts";
import { seedDevAccount } from "./seed-dev-account.ts";

/**
 * Prints a session cookie for an account in the database of `pnpm dev`, so
 * that an agent can sign in without a passkey: the account `--name` names, or
 * the oldest one.
 */
async function main() {
  const values = readCliOptions({
    "db-port": { type: "string" },
    "app-port": { type: "string" },
    name: { type: "string" },
  });
  const appPort = readPortOption("app-port", values["app-port"]);
  const { databaseUrl } = readDevBuddyEnv(
    readPortOption("db-port", values["db-port"]),
  );
  if (databaseUrl === "") {
    throw new Error(
      "BUDDY_DATABASE_URL is empty, so `pnpm dev` runs without a database.",
    );
  }
  assertLocalDatabaseUrl(
    databaseUrl,
    "buddy:session signs in to a local database only.",
  );

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const db = drizzle({ client: pool, schema });
    await seedDevAccount(db).catch((error: unknown) => {
      throw new Error(
        `No database answers at ${databaseUrl}. Start \`pnpm dev\` in apps/buddy first.`,
        { cause: error },
      );
    });
    const { account, token } = await db.transaction(async (tx) => {
      const account = (
        await tx
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(
            values.name === undefined
              ? undefined
              : eq(accounts.name, values.name),
          )
          .orderBy(asc(accounts.createdAt), asc(accounts.id))
          .limit(1)
      ).at(0);
      if (account === undefined) {
        throw new Error(`No account is named ${values.name ?? ""}.`);
      }
      const token = await createSession(tx, {
        userId: account.id,
        userAgent: "buddy:session",
        now: new Date(),
      });
      return { account, token };
    });
    const name = buddySessionCookie.name;
    console.log(`Session for ${account.name} (${account.id}).`);
    console.log(`Cookie: ${name}=${token}`);
    console.log(
      `playwright-cli cookie-set ${name} ${token} --domain=localhost --path=/ --httpOnly --sameSite=Lax`,
    );
    console.log(`Then open http://localhost:${String(appPort)}/macs`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
