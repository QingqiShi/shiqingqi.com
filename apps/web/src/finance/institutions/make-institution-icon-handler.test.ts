import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { institutionIcons } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { makeInstitutionIconHandler } from "./make-institution-icon-handler.ts";

const DB_HOOK_TIMEOUT = 60_000;
const IMAGE = new Uint8Array([82, 73, 70, 70]);

let db: TestDb;
let session: FinanceSession | null;

beforeEach(async () => {
  db = await createTestDb();
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: randomUUID(),
    memberId: randomUUID(),
    role: "member",
  };
  await db.insert(institutionIcons).values([
    { domain: "wise.com", image: IMAGE, version: "v1" },
    { domain: "broken.com", attempts: 3 },
  ]);
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function get(domain: string, headers: HeadersInit = {}) {
  const handler = makeInstitutionIconHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
  });
  return handler(
    new Request(`https://qingqi.dev/api/finance/institution-icons/${domain}`, {
      headers,
    }),
    { params: Promise.resolve({ domain }) },
  );
}

describe("makeInstitutionIconHandler", () => {
  it("serves the icon for a day with its version as the ETag", async () => {
    const response = await get("wise.com");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=86400",
    );
    expect(response.headers.get("ETag")).toBe('"v1"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(IMAGE);
  });

  it("answers 304 for the same ETag, and sends the new icon for an old one", async () => {
    const same = await get("wise.com", { "If-None-Match": '"v1"' });
    expect(same.status).toBe(304);
    expect(same.headers.get("ETag")).toBe('"v1"');

    const old = await get("wise.com", { "If-None-Match": '"v0"' });
    expect(old.status).toBe(200);
    expect(new Uint8Array(await old.arrayBuffer())).toEqual(IMAGE);
  });

  it("answers 404 for a domain with no icon, a failed fetch, or a name that is not a domain", async () => {
    for (const domain of ["monzo.com", "broken.com", "localhost", "..%2F"]) {
      const response = await get(domain);
      expect(response.status, domain).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }
  });

  it("refuses a request without a session", async () => {
    session = null;
    expect((await get("wise.com")).status).toBe(401);
  });
});
