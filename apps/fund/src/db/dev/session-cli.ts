import { runTransaction } from "@tuja/server-db/run-transaction";
import { asc } from "drizzle-orm";
import { fundAuthStore } from "../../auth/fund-auth-store.ts";
import { fundSessionCookie } from "../../auth/fund-session-cookie.ts";
import { users } from "../schema.ts";
import { openLocalDb, worktreePort } from "./open-local-db.ts";
import { seedDevUser } from "./seed-dev-user.ts";

const APP_PORT_OFFSET = 500;

/**
 * Prints a session cookie for the oldest user in the local database of
 * `pnpm dev`, so that an agent can sign in without a passkey.
 */
async function main() {
  const { db, close } = await openLocalDb({
    cli: "fund:session",
    maxConnections: 1,
  });
  try {
    await seedDevUser(db);
    const { user, token } = await runTransaction(db, async (tx) => {
      const [user] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .orderBy(asc(users.createdAt), asc(users.id))
        .limit(1);
      const token = await fundAuthStore.createSession(tx, {
        userId: user.id,
        userAgent: "fund:session",
        now: new Date(),
        maxAgeSeconds: fundSessionCookie.maxAgeSeconds,
      });
      return { user, token };
    });
    const name = fundSessionCookie.name;
    console.log(`Session for ${user.email} (${user.id}).`);
    console.log(`Cookie: ${name}=${token}`);
    console.log(
      `playwright-cli cookie-set ${name} ${token} --domain=localhost --path=/ --httpOnly --sameSite=Lax`,
    );
    console.log(
      `Then open http://localhost:${String(worktreePort(APP_PORT_OFFSET))}`,
    );
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
