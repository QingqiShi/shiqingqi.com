import { randomUUID } from "node:crypto";
import { hashToken } from "@tuja/server-auth/hash-token";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  captureTokens,
  todos,
  userSettings,
} from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { captureLimits, captureTokenStore } from "./capture-token-store.ts";
import { makeCaptureHandlers } from "./make-capture-handlers.ts";

const ORIGIN = "http://localhost:3000";
// Sunday 1 November 2026 in London, and already Monday 2 November in Shanghai.
const NOW = new Date("2026-11-01T20:00:00Z");

let db: TestDb;
let owner: string;
let stranger: string;
let now: Date;
let handlers: ReturnType<typeof makeCaptureHandlers>;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  stranger = await insertUser(db);
  now = NOW;
  handlers = makeCaptureHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () =>
      Promise.resolve({ sessionId: randomUUID(), userId: owner }),
    now: () => now,
  });
});

afterEach(async () => {
  await db.close();
});

async function tokenOf(userId: string) {
  return (await captureTokenStore.create({ db, userId }, now)).token;
}

function capture(
  authorization: string | null,
  body: BodyInit | null = JSON.stringify({ text: "Call mum" }),
) {
  return handlers.capture(
    new Request(`${ORIGIN}/api/todos/capture`, {
      method: "POST",
      headers: authorization === null ? {} : { Authorization: authorization },
      body,
    }),
  );
}

const rowsOf = (userId: string) =>
  db.select().from(todos).where(eq(todos.userId, userId));

describe("a capture request", () => {
  it("adds a to-do as the owner's own, for the token's owner only", async () => {
    const response = await capture(`Bearer ${await tokenOf(owner)}`);

    expect(response.status).toBe(201);
    const [row] = await rowsOf(owner);
    expect(row).toMatchObject({
      title: "Call mum",
      createdBy: "owner",
      ownerEditedFields: ["title"],
    });
    expect(await response.json()).toEqual({
      id: row.id,
      title: "Call mum",
      dueDate: null,
    });
    expect(await rowsOf(stranger)).toEqual([]);
  });

  it("reads the date from the text on the owner's day", async () => {
    await db
      .insert(userSettings)
      .values({ userId: owner, timeZone: "Asia/Shanghai" });

    const response = await capture(
      `Bearer ${await tokenOf(owner)}`,
      JSON.stringify({ text: "明天交报销" }),
    );

    expect(await response.json()).toMatchObject({
      title: "交报销",
      dueDate: "2026-11-03",
    });
    const [row] = await rowsOf(owner);
    expect(row.ownerEditedFields.toSorted()).toEqual(["dueDate", "title"]);
  });

  it("refuses a missing, malformed, wrong or revoked token alike", async () => {
    const token = await tokenOf(owner);
    const [id] = token.split(".");
    const revoked = await captureTokenStore.create({ db, userId: owner }, now);
    await captureTokenStore.revoke({ db, userId: owner }, revoked.id);

    const answers = await Promise.all(
      [
        null,
        "",
        "Bearer",
        token,
        "Basic abc",
        "Bearer not-a-token",
        `Bearer not-a-uuid.${token.split(".")[1]}`,
        `Bearer ${id}.wrong-secret`,
        `Bearer ${randomUUID()}.${token.split(".")[1]}`,
        `Bearer ${token}.more`,
        `Bearer ${revoked.token}`,
      ].map((authorization) => capture(authorization)),
    );

    for (const answer of answers) {
      expect(answer.status).toBe(401);
      expect(await answer.json()).toEqual({ error: "unauthorised" });
    }
    expect(await rowsOf(owner)).toEqual([]);
  });

  it("stores only the hash of the secret", async () => {
    const token = await tokenOf(owner);
    const [row] = await db.select().from(captureTokens);

    expect(row.tokenHash).toEqual(hashToken(token.split(".")[1]));
    expect(JSON.stringify(row)).not.toContain(token.split(".")[1]);
  });

  it("stops at the rate limit, without adding, until the window ends", async () => {
    const token = await tokenOf(owner);
    await db
      .update(captureTokens)
      .set({ windowCount: captureLimits.requestsPerWindow - 1 });

    expect((await capture(`Bearer ${token}`)).status).toBe(201);
    now = new Date(NOW.getTime() + captureLimits.windowMs - 90_000);
    const limited = await capture(`Bearer ${token}`);

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("90");
    expect(await rowsOf(owner)).toHaveLength(1);

    now = new Date(NOW.getTime() + captureLimits.windowMs);
    expect((await capture(`Bearer ${token}`)).status).toBe(201);
    const [row] = await db.select().from(captureTokens);
    expect(row.windowCount).toBe(1);
  });

  it("does not count a wrong secret against the token's limit", async () => {
    const token = await tokenOf(owner);
    const [id] = token.split(".");
    await db
      .update(captureTokens)
      .set({ windowCount: captureLimits.requestsPerWindow - 1 });

    expect((await capture(`Bearer ${id}.wrong`)).status).toBe(401);

    expect((await capture(`Bearer ${token}`)).status).toBe(201);
  });

  it("refuses a body over the limit", async () => {
    const token = await tokenOf(owner);

    const answer = await capture(
      `Bearer ${token}`,
      "x".repeat(captureLimits.bodyBytes + 1),
    );

    expect(answer.status).toBe(413);
    expect(await rowsOf(owner)).toEqual([]);
  });

  it("refuses a body that does not hold one fitting text", async () => {
    const token = await tokenOf(owner);
    const bodies = [
      null,
      "not json",
      "null",
      JSON.stringify({}),
      JSON.stringify({ text: "   " }),
      JSON.stringify({ text: "x".repeat(301) }),
      JSON.stringify({ text: "Pay", userId: stranger }),
      JSON.stringify({ text: "Pay", id: randomUUID() }),
    ];

    for (const body of bodies) {
      expect((await capture(`Bearer ${token}`, body)).status).toBe(400);
    }
    expect(await rowsOf(owner)).toEqual([]);
    expect(await rowsOf(stranger)).toEqual([]);
  });

  it("makes the text one line, so that a NUL cannot fail the insert", async () => {
    const response = await capture(
      `Bearer ${await tokenOf(owner)}`,
      JSON.stringify({ text: " Call\nmum\u0000 " }),
    );

    expect(await response.json()).toMatchObject({ title: "Call mum" });
  });
});

describe("the owner's token requests", () => {
  function tokenRequest(method: string, origin = ORIGIN) {
    return new Request(`${ORIGIN}/api/settings/capture-tokens`, {
      method,
      headers: { Origin: origin },
    });
  }

  it("make a token that works, and take it away", async () => {
    const made = await handlers.createToken(tokenRequest("POST"));
    expect(made.status).toBe(201);
    const { id, token } = z
      .object({ id: z.string(), token: z.string() })
      .parse(await made.json());
    expect((await capture(`Bearer ${token}`)).status).toBe(201);

    const revoked = await handlers.revokeToken(tokenRequest("DELETE"), id);

    expect(revoked.status).toBe(204);
    expect((await capture(`Bearer ${token}`)).status).toBe(401);
  });

  it("refuse another origin, and do not touch another user's token", async () => {
    const theirs = await captureTokenStore.create(
      { db, userId: stranger },
      now,
    );

    expect(
      (await handlers.createToken(tokenRequest("POST", "https://evil.example")))
        .status,
    ).toBe(403);
    expect(
      (await handlers.revokeToken(tokenRequest("DELETE"), theirs.id)).status,
    ).toBe(404);
    expect(
      (await handlers.revokeToken(tokenRequest("DELETE"), "not-a-uuid")).status,
    ).toBe(404);
    expect((await capture(`Bearer ${theirs.token}`)).status).toBe(201);
    expect(await rowsOf(stranger)).toHaveLength(1);
  });

  it("list only the user's tokens, without any secret", async () => {
    const mine = await captureTokenStore.create({ db, userId: owner }, now);
    await captureTokenStore.create({ db, userId: stranger }, now);

    const listed = await captureTokenStore.list({ db, userId: owner });

    expect(listed).toEqual([{ id: mine.id, createdAt: now, lastUsedAt: null }]);
  });
});
