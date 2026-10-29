import { parseArgs } from "node:util";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { BASE_URL } from "../../constants.ts";
import { members, schema } from "../db/schema.ts";
import { withHousehold } from "../db/with-household.ts";
import { assertLocalDatabaseUrl } from "../dev/assert-local-database-url.ts";
import { createInvite } from "./create-invite.ts";

const USAGE =
  "Usage: finance:invite-link <household id> <member id> [--origin <url>] [--locale en|zh] [--allow-remote]";

async function main() {
  // pnpm passes the `--` of `pnpm finance:invite-link -- <ids>` on to the script.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      origin: { type: "string", default: BASE_URL },
      locale: { type: "string", default: "en" },
      "allow-remote": { type: "boolean", default: false },
    },
  });
  const [householdId, memberId] = positionals;
  const { locale } = values;
  if (!householdId || !memberId || positionals.length > 2) {
    throw new Error(USAGE);
  }
  if (locale !== "en" && locale !== "zh") throw new Error(USAGE);
  const origin = new URL(values.origin).origin;

  const connectionString = process.env.FINANCE_DATABASE_URL;
  if (!connectionString) throw new Error("Set FINANCE_DATABASE_URL.");
  if (!values["allow-remote"]) {
    assertLocalDatabaseUrl(
      connectionString,
      "Pass --allow-remote to use it anyway.",
    );
  }

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool, schema });
    const { member, result } = await withHousehold(
      db,
      householdId,
      async (scope) => {
        const member = (
          await scope.db
            .select({ name: members.name })
            .from(members)
            .where(
              and(
                eq(members.householdId, householdId),
                eq(members.id, memberId),
              ),
            )
            .limit(1)
        ).at(0);
        if (!member) {
          throw new Error(`No member ${memberId} in household ${householdId}.`);
        }
        const result = await createInvite(scope, {
          memberId,
          createdBy: null,
          allowRecovery: true,
          now: new Date(),
        });
        return { member, result };
      },
    );
    if (!result.ok) {
      throw new Error(`No invite for ${member.name}: ${result.reason}`);
    }
    console.log(
      `${result.recovery ? "Recovery link" : "Invite"} for ${member.name}, valid until ${result.expiresAt.toISOString()}:`,
    );
    console.log(`${origin}${getLocalePath(`/invite/${result.token}`, locale)}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
