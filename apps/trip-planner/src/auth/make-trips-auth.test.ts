import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { sessions, users } from "#src/db/auth-schema.ts";
import { schema } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { makeTripsAuth } from "./make-trips-auth.ts";
import { tripsAuthStore } from "./trips-auth-store.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";

const ORIGIN = "http://localhost:3000";

let client: PGlite;
let db: TripsDb;
let handlers: ReturnType<typeof makeTripsAuth>;

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  handlers = makeHandlers(db);
});

afterAll(() => client.close());

function makeHandlers(database: TripsDb) {
  return makeTripsAuth({
    getDb: () => database,
    now: () => new Date(),
    authSecret: () => "test-secret",
    isAllowedOrigin: (origin) => origin === ORIGIN,
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    refundRequest: () => Promise.resolve(),
    clientIp: () => "test",
    emailSender: () => null,
    afterResponse: () => {},
  });
}

async function addUser(email: string) {
  const userId = crypto.randomUUID();
  const now = new Date();
  await db.insert(users).values({ id: userId, email });
  const token = await tripsAuthStore.createSession(db, {
    userId,
    userAgent: "vitest",
    now,
    maxAgeSeconds: tripsSessionCookie.maxAgeSeconds,
  });
  return { userId, token };
}

function deleteAccount(token?: string, { deleteAccount: route } = handlers) {
  const headers = new Headers({
    Origin: ORIGIN,
    "Content-Type": "application/json",
  });
  if (token) headers.set("Cookie", `${tripsSessionCookie.name}=${token}`);
  return route(
    new Request(`${ORIGIN}/api/auth/delete-account`, {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
}

it("deletes the signed-in user with their sessions, and no other user", async () => {
  const mara = await addUser("mara@example.com");
  const noor = await addUser("noor@example.com");

  expect((await deleteAccount()).status).toBe(401);
  expect((await deleteAccount("not-a-session")).status).toBe(401);
  expect(await db.$count(users)).toBe(2);

  const response = await deleteAccount(mara.token);

  expect(response.status).toBe(200);
  expect(await db.select({ id: users.id }).from(users)).toEqual([
    { id: noor.userId },
  ]);
  expect(await db.select({ userId: sessions.userId }).from(sessions)).toEqual([
    { userId: noor.userId },
  ]);
  expect((await deleteAccount(mara.token)).status).toBe(401);
});

it("keeps a user whose session ended while the request was under way", async () => {
  const state = {
    transactions: 0,
    runBefore: 0,
    task: (): Promise<unknown> => Promise.resolve(),
  };
  const racing = makeHandlers(
    new Proxy(db, {
      get(target, key) {
        const value: unknown = Reflect.get(target, key);
        if (key !== "transaction") return value;
        const transaction: TripsDb["transaction"] = async (...args) => {
          state.transactions += 1;
          if (state.transactions === state.runBefore) await state.task();
          return target.transaction(...args);
        };
        return transaction;
      },
    }),
  );
  const other = await addUser("other@example.com");
  const owner = await addUser("owner@example.com");

  expect((await deleteAccount(other.token, racing)).status).toBe(200);
  state.runBefore = state.transactions;
  state.transactions = 0;
  state.task = () =>
    db.delete(sessions).where(eq(sessions.userId, owner.userId));
  const response = await deleteAccount(owner.token, racing);

  expect(response.status).toBe(401);
  expect(
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, owner.userId)),
  ).toHaveLength(1);
});
