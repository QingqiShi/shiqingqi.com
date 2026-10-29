import { and, asc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bindNewUserToMember } from "../../auth/bind-new-user-to-member.ts";
import { createSession } from "../../auth/create-session.ts";
import { financeSessionCookie } from "../../auth/finance-session-cookie.ts";
import { lookups } from "../../db/lookups.ts";
import { households, members, schema } from "../../db/schema.ts";
import type { FinanceDb } from "../../db/types.ts";
import { asFinanceApp, withHousehold } from "../../db/with-household.ts";
import { assertLocalDatabaseUrl } from "../assert-local-database-url.ts";
import { readCliOptions, readPortOption } from "../read-cli-options.ts";
import { readDevFinanceEnv } from "../read-dev-finance-env.ts";

/** The live owner of the oldest Household. */
async function findOwner(db: FinanceDb) {
  const householdIds = await asFinanceApp(db, (tx) => lookups.householdIds(tx));
  const owners = [];
  for (const householdId of householdIds) {
    const owner = await withHousehold(db, householdId, async (scope) =>
      (
        await scope.db
          .select({
            householdId: households.id,
            householdName: households.name,
            householdCreatedAt: households.createdAt,
            memberId: members.id,
            memberName: members.name,
            userId: members.userId,
          })
          .from(members)
          .innerJoin(households, eq(households.id, members.householdId))
          .where(and(eq(members.role, "owner"), isNull(members.deletedAt)))
          .orderBy(asc(members.createdAt))
          .limit(1)
      ).at(0),
    );
    if (owner) owners.push(owner);
  }
  return owners
    .sort(
      (a, b) => a.householdCreatedAt.getTime() - b.householdCreatedAt.getTime(),
    )
    .at(0);
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
        `No database answers at ${databaseUrl}. Start \`pnpm dev\` in apps/finance first.`,
        { cause: error },
      );
    });
    if (!owner) {
      throw new Error(
        "The database has no Household. `pnpm dev` seeds one when it starts.",
      );
    }
    const token = await asFinanceApp(db, async (tx) => {
      const userId =
        owner.userId ??
        (await bindNewUserToMember(tx, {
          householdId: owner.householdId,
          memberId: owner.memberId,
          displayName: owner.memberName,
        }));
      return createSession(tx, {
        userId,
        userAgent: "finance:session",
        now: new Date(),
      });
    });
    const name = financeSessionCookie.name;
    console.log(
      `Session for ${owner.memberName}, owner of ${owner.householdName}.`,
    );
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
