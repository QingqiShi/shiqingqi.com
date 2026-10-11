import { and, asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bindNewUserToMember } from "../../auth/bind-new-user-to-member.ts";
import { createSession } from "../../auth/create-session.ts";
import { financeSessionCookie } from "../../auth/finance-session-cookie.ts";
import { households, members, schema } from "../../db/schema.ts";
import type { FinanceDb } from "../../db/types.ts";
import { assertLocalDatabaseUrl } from "../assert-local-database-url.ts";
import { readCliOptions, readPortOption } from "../read-cli-options.ts";
import { readDevFinanceEnv } from "../read-dev-finance-env.ts";

async function findOwner(db: FinanceDb) {
  return (
    await db
      .select({
        householdId: households.id,
        householdName: households.name,
        memberId: members.id,
        memberName: members.name,
        userId: members.userId,
      })
      .from(members)
      .innerJoin(households, eq(households.id, members.householdId))
      .where(and(eq(members.role, "owner"), isNull(members.deletedAt)))
      .orderBy(asc(households.createdAt), asc(members.createdAt))
      .limit(1)
  ).at(0);
}

/**
 * Prints a Finance session cookie for the owner of the first Household in
 * the database of `pnpm dev`, so that an agent can sign in without a passkey.
 */
async function main() {
  const values = readCliOptions({
    "db-port": { type: "string" },
    "app-port": { type: "string" },
  });
  const appPort = readPortOption("app-port", values["app-port"]);
  const { databaseUrl } = readDevFinanceEnv(
    readPortOption("db-port", values["db-port"]),
  );
  if (databaseUrl === "") {
    throw new Error(
      "FINANCE_DATABASE_URL is empty, so `pnpm dev` runs without Finance.",
    );
  }
  assertLocalDatabaseUrl(
    databaseUrl,
    "finance:session signs in to a local database only.",
  );

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const db = drizzle({ client: pool, schema });
    const owner = await findOwner(db).catch((error: unknown) => {
      throw new Error(
        `No database answers at ${databaseUrl}. Start \`pnpm dev\` in apps/web first.`,
        { cause: error },
      );
    });
    if (!owner) {
      throw new Error(
        "The database has no Household. `pnpm dev` seeds one when it starts.",
      );
    }
    const userId =
      owner.userId ??
      (await db.transaction((tx) =>
        bindNewUserToMember(tx, {
          householdId: owner.householdId,
          memberId: owner.memberId,
          displayName: owner.memberName,
        }),
      ));
    const token = await createSession(db, {
      userId,
      userAgent: "finance:session",
      now: new Date(),
    });
    const name = financeSessionCookie.name;
    console.log(
      `Session for ${owner.memberName}, owner of ${owner.householdName}.`,
    );
    console.log(`Cookie: ${name}=${token}`);
    console.log(
      `playwright-cli cookie-set ${name} ${token} --domain=localhost --path=/ --httpOnly --sameSite=Lax`,
    );
    console.log(`Then open http://localhost:${String(appPort)}/finance`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
