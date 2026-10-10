import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import {
  makeSuggestHandler,
  type SuggestHandlerDependencies,
} from "./make-suggest-handler.ts";
import { createLabellingModel } from "./testing/create-labelling-model.ts";

const ORIGIN = "https://qingqi.dev";
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let model: ReturnType<typeof createLabellingModel> | null;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
  model = createLabellingModel(() => ({
    payeeName: "Grocer",
    categoryId: home.groceriesId,
    confidence: 0.9,
  }));
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function suggest(
  body: unknown,
  origin = ORIGIN,
  overrides: Partial<SuggestHandlerDependencies> = {},
) {
  const handler = makeSuggestHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    getModel: () => model,
    ...overrides,
  });
  return handler(
    new Request(`${ORIGIN}/api/finance/ai/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    }),
  );
}

const body = () => ({
  text: "GROCER 12 LONDON",
  amountMinor: -1200,
  date: "2026-10-09",
  accountId: home.currentId,
});

describe("makeSuggestHandler", () => {
  it("answers with the model's Suggestion", async () => {
    const response = await suggest(body());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      payeeId: home.grocerId,
      categoryId: home.groceriesId,
      tagIds: [],
      confidence: 0.9,
      source: "model",
    });
  });

  it("guards the origin, the session, the body and the model", async () => {
    expect((await suggest(body(), "https://evil.example")).status).toBe(403);
    expect((await suggest({ ...body(), accountId: randomUUID() })).status).toBe(
      400,
    );
    expect((await suggest({ ...body(), text: "" })).status).toBe(400);
    model = null;
    expect((await suggest(body())).status).toBe(503);
    session = null;
    expect((await suggest(body())).status).toBe(401);
  });

  it("limits how often a member asks the model", async () => {
    const buckets: string[] = [];

    const response = await suggest(body(), ORIGIN, {
      limitRequest: (bucket) => {
        buckets.push(bucket);
        return Promise.resolve({ success: false, reset: 0 });
      },
    });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "too-many-requests" });
    expect(buckets).toEqual(["ai-suggest"]);
    expect(model?.doGenerateCalls ?? []).toHaveLength(0);
  });
});
