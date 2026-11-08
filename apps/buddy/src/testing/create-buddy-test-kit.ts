import { randomUUID } from "node:crypto";
import { buddySessionCookie } from "#src/server/auth/buddy-session-cookie.ts";
import { createSession } from "#src/server/auth/create-session.ts";
import { accounts } from "#src/server/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/server/db/testing/create-test-db.ts";
import { makeMachineRegistry } from "#src/server/machines/make-machine-registry.ts";
import { MemoryBuddyKv } from "#src/server/store/memory-buddy-kv.ts";

export const TEST_SECRET = "test-auth-secret";

/**
 * A Postgres and a Redis, both in memory, on one clock that a test can move,
 * with the machine registry over them.
 */
export async function createBuddyTestKit(start = 1_800_000_000_000) {
  const clock = { now: start };
  const db: TestDb = await createTestDb();
  const kv = new MemoryBuddyKv(() => clock.now);
  const registry = makeMachineRegistry({ kv, secret: TEST_SECRET });

  /** Public unless `isPublic` is false, so that a test can read the pet as a visitor does. */
  async function addAccount(name: string, { isPublic = true } = {}) {
    const id = randomUUID();
    await db.insert(accounts).values({
      id,
      name,
      email: `${name}@example.com`,
      isPublic,
    });
    await registry.setVisibility({ userId: id, name, isPublic });
    return id;
  }

  /** The Cookie header of a new session of the account. */
  async function sessionCookie(userId: string) {
    const token = await createSession(db, {
      userId,
      userAgent: "vitest",
      now: new Date(clock.now),
    });
    return `${buddySessionCookie.name}=${token}`;
  }

  return { clock, db, kv, registry, addAccount, sessionCookie };
}
