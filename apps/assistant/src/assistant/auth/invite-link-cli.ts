import { parseArgs } from "node:util";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { BASE_URL } from "../../constants.ts";
import { schema, users } from "../db/schema.ts";
import { asAssistantApp } from "../db/with-user.ts";
import { assertLocalDatabaseUrl } from "../dev/assert-local-database-url.ts";
import { createInvite } from "./create-invite.ts";

const USAGE =
  "Usage: assistant:invite-link (--name <new user's name> | --user <user id>) [--origin <url>] [--locale en|zh] [--allow-remote]";

/**
 * Prints an invite link. `--name` makes a new user; `--user` lets a user who
 * lost every passkey back in, and their old passkeys stop working.
 */
async function main() {
  // pnpm passes the `--` of `pnpm assistant:invite-link -- --name …` on to the script.
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const { values } = parseArgs({
    args,
    options: {
      name: { type: "string" },
      user: { type: "string" },
      origin: { type: "string", default: BASE_URL },
      locale: { type: "string", default: "en" },
      "allow-remote": { type: "boolean", default: false },
    },
  });
  const { locale, user: userId } = values;
  const name = values.name?.trim();
  if ((name === undefined) === (userId === undefined) || name === "") {
    throw new Error(USAGE);
  }
  if (locale !== "en" && locale !== "zh") throw new Error(USAGE);
  const origin = new URL(values.origin).origin;

  const connectionString = process.env.ASSISTANT_DATABASE_URL;
  if (!connectionString) throw new Error("Set ASSISTANT_DATABASE_URL.");
  if (!values["allow-remote"]) {
    assertLocalDatabaseUrl(
      connectionString,
      "Pass --allow-remote to use it anyway.",
    );
  }

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool, schema });
    const { displayName, invite } = await asAssistantApp(db, async (tx) => {
      if (userId === undefined) {
        const displayName = name ?? "";
        const invite = await createInvite(tx, {
          kind: "new-user",
          displayName,
          now: new Date(),
        });
        return { displayName, invite };
      }
      const user = (
        await tx
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      ).at(0);
      if (!user) throw new Error(`No user ${userId}.`);
      const invite = await createInvite(tx, {
        kind: "recovery",
        userId,
        displayName: user.displayName,
        now: new Date(),
      });
      return { displayName: user.displayName, invite };
    });
    console.log(
      `${userId === undefined ? "Invite" : "Recovery link"} for ${displayName}, valid until ${invite.expiresAt.toISOString()}:`,
    );
    console.log(`${origin}${getLocalePath(`/invite/${invite.token}`, locale)}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
