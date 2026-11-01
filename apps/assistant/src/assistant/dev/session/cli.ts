import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assistantSessionCookie } from "../../auth/assistant-session-cookie.ts";
import { createSession } from "../../auth/create-session.ts";
import { schema, users } from "../../db/schema.ts";
import { asAssistantApp } from "../../db/with-user.ts";
import { assertLocalDatabaseUrl } from "../assert-local-database-url.ts";
import { readCliOptions, readPortOption } from "../read-cli-options.ts";
import { readDevAssistantEnv } from "../read-dev-assistant-env.ts";
import { seedDevUser } from "../seed-dev-user.ts";

/**
 * Prints a session cookie for the oldest user in the database of `pnpm dev`,
 * so that an agent can sign in without a passkey.
 */
async function main() {
  const values = readCliOptions({
    "db-port": { type: "string" },
    "app-port": { type: "string" },
  });
  const appPort = readPortOption("app-port", values["app-port"]);
  const { databaseUrl } = readDevAssistantEnv(
    readPortOption("db-port", values["db-port"]),
  );
  if (databaseUrl === "") {
    throw new Error(
      "ASSISTANT_DATABASE_URL is empty, so `pnpm dev` runs without a database.",
    );
  }
  assertLocalDatabaseUrl(
    databaseUrl,
    "assistant:session signs in to a local database only.",
  );

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const db = drizzle({ client: pool, schema });
    await seedDevUser(db).catch((error: unknown) => {
      throw new Error(
        `No database answers at ${databaseUrl}. Start \`pnpm dev\` in apps/assistant first.`,
        { cause: error },
      );
    });
    const { user, token } = await asAssistantApp(db, async (tx) => {
      const [user] = await tx
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .orderBy(asc(users.createdAt), asc(users.id))
        .limit(1);
      const token = await createSession(tx, {
        userId: user.id,
        userAgent: "assistant:session",
        now: new Date(),
      });
      return { user, token };
    });
    const name = assistantSessionCookie.name;
    console.log(`Session for ${user.displayName} (${user.id}).`);
    console.log(`Cookie: ${name}=${token}`);
    console.log(
      `playwright-cli cookie-set ${name} ${token} --domain=localhost --path=/ --httpOnly --sameSite=Lax`,
    );
    console.log(`Then open http://localhost:${String(appPort)}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
