import { randomUUID } from "node:crypto";
import { hashToken } from "@tuja/server-auth/hash-token";
import { sql } from "drizzle-orm";
import { NextRequest, type NextResponse } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18nConfig } from "#src/i18n/i18n-config.ts";
import { assistantSessionCookie } from "../auth/assistant-session-cookie.ts";
import { morningReports, sessions, users } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { makeAssistantProxy } from "./assistant-proxy.ts";

const ORIGIN = "http://localhost:3000";
const NOW = new Date("2026-11-04T08:00:00Z");
const LIVE_TOKEN = "live-token";
const EXPIRED_TOKEN = "expired-token";

let db: TestDb;
let userId: string;

beforeEach(async () => {
  db = await createTestDb();
  userId = randomUUID();
  await db.insert(users).values({ id: userId, displayName: "Owner" });
  await db.insert(sessions).values([
    {
      id: randomUUID(),
      userId,
      tokenHash: hashToken(LIVE_TOKEN),
      expiresAt: new Date(NOW.getTime() + 60_000),
    },
    {
      id: randomUUID(),
      userId,
      tokenHash: hashToken(EXPIRED_TOKEN),
      expiresAt: new Date(NOW.getTime() - 60_000),
    },
  ]);
});

afterEach(async () => {
  await db.close();
});

function run(path: string, token?: string) {
  const request = new NextRequest(`${ORIGIN}${path}`, {
    headers: token
      ? { Cookie: `${assistantSessionCookie.name}=${token}` }
      : undefined,
  });
  return makeAssistantProxy({ getDb: () => db, now: () => NOW })(
    request,
    i18nRouter(request, i18nConfig),
  );
}

function rewrittenPath(response: NextResponse) {
  const rewrite = response.headers.get("x-middleware-rewrite");
  return rewrite === null ? null : new URL(rewrite, ORIGIN).pathname;
}

describe("assistantProxy at the root", () => {
  it.each([
    ["/", "/en/public-home"],
    ["/zh", "/zh/public-home"],
  ])("shows %s without a cookie as the public home page", async (path, to) => {
    expect(rewrittenPath(await run(path))).toBe(to);
  });

  it.each([EXPIRED_TOKEN, "garbage"])(
    "treats the session cookie %s as signed out",
    async (token) => {
      const response = await run("/", token);
      expect(response.status).toBe(200);
      expect(rewrittenPath(response)).toBe("/en/public-home");
    },
  );

  it("sends a live session to the view that Home chooses, before the page streams", async () => {
    const plan = await run("/", LIVE_TOKEN);
    expect(plan.status).toBe(307);
    expect(plan.headers.get("location")).toBe(`${ORIGIN}/?view=plan`);

    await db.insert(morningReports).values({
      userId,
      localDate: "2026-11-04",
      builtAt: NOW,
      content: {
        version: 2,
        mailDate: "2026-11-03",
        status: "failed",
        headline: null,
        needsAction: [],
        worthKnowing: [],
        rest: null,
        agenda: null,
        mailCount: 0,
        ranOutOfTime: false,
        unreadMailboxes: [],
        doneTodos: [],
      },
    });
    const report = await run("/zh", LIVE_TOKEN);
    expect(report.headers.get("location")).toBe(`${ORIGIN}/zh?view=report`);
  });

  it("gives a live session the view that the address names", async () => {
    expect(rewrittenPath(await run("/?view=report", LIVE_TOKEN))).toBe("/en");
    expect(rewrittenPath(await run("/zh?view=plan", LIVE_TOKEN))).toBeNull();
  });

  it("gives Home when the session cannot be read, because the page checks it again", async () => {
    await db.execute(sql`DROP TABLE sessions`);
    expect(rewrittenPath(await run("/", LIVE_TOKEN))).toBe("/en");
  });
});

describe("assistantProxy on other paths", () => {
  it("sends a visitor without a cookie to sign-in with next", async () => {
    for (const path of ["/todos", "/about"]) {
      const response = await run(`${path}?x=1`);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `${ORIGIN}/sign-in?next=${encodeURIComponent(`${path}?x=1`)}`,
      );
    }
  });

  it("does not make a second address of the public home page", async () => {
    for (const token of [undefined, LIVE_TOKEN]) {
      expect(rewrittenPath(await run("/public-home", token))).toBe(
        "/en/missing",
      );
      expect(rewrittenPath(await run("/zh/public-home", token))).toBe(
        "/zh/missing",
      );
    }
  });
});
