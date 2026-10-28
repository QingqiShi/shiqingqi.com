import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { institutionIcons } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { makeInstitutionIconHandler } from "./make-institution-icon-handler.ts";

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
});

afterEach(async () => {
  await db.close();
});

function get(domain: string) {
  const handler = makeInstitutionIconHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
  });
  return handler(
    new Request(
      `https://qingqi.dev/api/finance/institution-icons/${domain}?v=v1`,
    ),
    { params: Promise.resolve({ domain }) },
  );
}

describe("makeInstitutionIconHandler", () => {
  it("refuses a request without a session", async () => {
    session = null;
    expect((await get("wise.com")).status).toBe(401);
  });
});
