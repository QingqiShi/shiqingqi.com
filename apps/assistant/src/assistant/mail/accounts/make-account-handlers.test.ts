import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertUser,
  mailDeps,
  storedAccount,
} from "#src/assistant/mail/testing/insert-account.ts";
import { makeAccountHandlers } from "./make-account-handlers.ts";

const ORIGIN = "http://localhost:3000";

let db: TestDb;
let userId: string;
let afterTasks: (() => Promise<unknown>)[];
let hosts: string[];

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  afterTasks = [];
  hosts = [];
});

afterEach(async () => {
  await db.close();
});

function connect(appPassword: string, provider: "icloud" | "gmail" = "icloud") {
  const server = createFakeMailServer({
    user: "me@icloud.com",
    password: "abcd-efgh-ijkl-mnop",
  });
  const handlers = makeAccountHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve({ sessionId: randomUUID(), userId }),
    getMailDeps: () =>
      mailDeps({
        connector: (mailServer, auth) => {
          hosts.push(mailServer.host);
          return server.connector(mailServer, auth);
        },
      }),
    now: () => new Date(),
    runAfter: (task) => {
      afterTasks.push(task);
    },
  });
  const handler =
    provider === "gmail" ? handlers.connectGmail : handlers.connectIcloud;
  return handler(
    new Request(`${ORIGIN}/api/accounts/${provider}`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ address: "Me@iCloud.com", appPassword }),
    }),
  );
}

function accounts() {
  return db.select().from(mailAccounts);
}

describe("connecting with an app password", () => {
  it("stores nothing when the server refuses the app password", async () => {
    const response = await connect("wrong-password");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "login-refused" });
    expect(await accounts()).toEqual([]);
  });

  it("stores the login that the server accepted, sealed, and syncs it after the response", async () => {
    const response = await connect(" abcd-efgh-ijkl-mnop ");

    expect(response.status).toBe(201);
    const [account] = await accounts();
    expect(account).toMatchObject({
      provider: "icloud",
      address: "me@icloud.com",
    });
    expect(Buffer.from(account.credential).toString("latin1")).not.toContain(
      "abcd-efgh",
    );
    expect((await storedAccount(db, userId, account.id)).opened).toEqual({
      type: "password",
      password: "abcd-efgh-ijkl-mnop",
    });
    expect(afterTasks).toHaveLength(1);
  });

  it("connects Gmail with an app password at Gmail's IMAP server", async () => {
    const response = await connect("abcd-efgh-ijkl-mnop", "gmail");

    expect(response.status).toBe(201);
    expect(hosts).toEqual(["imap.gmail.com"]);
    expect(await accounts()).toMatchObject([{ provider: "gmail" }]);
  });
});
