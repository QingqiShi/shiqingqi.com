import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { seedBankLink } from "../bank/testing/seed-bank-link.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { bankTransactions, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import {
  makeTeachHandler,
  type TeachHandlerDependencies,
} from "./make-teach-handler.ts";
import { createTeachingModel } from "./testing/create-teaching-model.ts";
import type { NamedLabels, TeachRequest } from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const INSTRUCTIONS = "Payments to J SMITH are rent.\nTesco is groceries.";

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let model: ReturnType<typeof createTeachingModel> | null;
let transactionId: string;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.partnerId,
    role: "member",
  };
  model = createTeachingModel({
    replaces: null,
    line: "TFL TRAVEL CH is the commute: Transport, tag Tube.",
  });
  await withHousehold(db, home.householdId, (scope) =>
    householdRepository.update(scope, { aiInstructions: INSTRUCTIONS }),
  );
  const linkId = await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "acc-current",
  });
  transactionId = randomUUID();
  await db.insert(transactions).values({
    id: transactionId,
    householdId: home.householdId,
    kind: "expense",
    date: "2026-10-09",
    categoryId: home.groceriesId,
    labelledBy: "member",
    aiReason: "TfL sells snacks at stations",
    source: "bank",
    version: 0,
  });
  await db.insert(bankTransactions).values({
    id: randomUUID(),
    householdId: home.householdId,
    linkId,
    providerTxId: "t1",
    date: "2026-10-09",
    amountMinor: -280,
    currency: "GBP",
    merchant: "TFL TRAVEL CH",
    description: "TFL.GOV.UK/CP",
    raw: {},
    state: "matched",
    transactionId,
    version: 0,
  });
});

afterEach(async () => {
  await db.close();
});

const aiLabels: NamedLabels = {
  kind: "expense",
  category: "Food > Groceries",
  payee: "TfL",
  tags: [],
  member: null,
  accounts: ["Current"],
};

const body = (): TeachRequest => ({
  transactionId,
  ai: aiLabels,
  member: { ...aiLabels, category: "Transport", tags: ["Tube"] },
});

function teach(
  input: unknown,
  origin = ORIGIN,
  overrides: Partial<TeachHandlerDependencies> = {},
) {
  const handler = makeTeachHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    getModel: () => model,
    ...overrides,
  });
  return handler(
    new Request(`${ORIGIN}/api/finance/ai/teach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(input),
    }),
  );
}

function promptOf(call: { prompt: readonly { content: unknown }[] }) {
  return JSON.stringify(call.prompt);
}

describe("makeTeachHandler", () => {
  it("sends the model the bank row, both sets of labels, the AI's reason and the instructions, and answers with its draft", async () => {
    const response = await teach(body());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      replaces: null,
      line: "TFL TRAVEL CH is the commute: Transport, tag Tube.",
    });
    const prompt = promptOf(model?.doGenerateCalls[0] ?? { prompt: [] });
    for (const part of [
      "2026-10-09 | -2.80 GBP | Current | TFL TRAVEL CH | TFL.GOV.UK/CP",
      "Payments to J SMITH are rent.",
      "TfL sells snacks at stations",
      "The AI's labels: kind expense; category Food > Groceries; payee TfL; tags none",
      "The member's labels: kind expense; category Transport; payee TfL; tags Tube",
    ]) {
      expect(prompt).toContain(part);
    }
  });

  it("keeps a changed line only when it is a line of the instructions", async () => {
    model = createTeachingModel({
      replaces: "  Tesco is groceries. ",
      line: "Tesco is groceries, but TESCO MOBILE is the phone bill.",
    });
    expect(await (await teach(body())).json()).toEqual({
      replaces: "Tesco is groceries.",
      line: "Tesco is groceries, but TESCO MOBILE is the phone bill.",
    });

    model = createTeachingModel({
      replaces: "A line nobody wrote",
      line: "TfL is\ntransport.",
    });
    expect(await (await teach(body())).json()).toEqual({
      replaces: null,
      line: "TfL is transport.",
    });
  });

  it("refuses a Transaction that did not come from the bank, and reports a failing model", async () => {
    expect(
      (await teach({ ...body(), transactionId: randomUUID() })).status,
    ).toBe(404);

    const errors: unknown[] = [];
    model = createTeachingModel(null);
    const failed = await teach(body(), ORIGIN, {
      onModelError: (error) => errors.push(error),
    });
    expect(failed.status).toBe(502);
    expect(errors).toHaveLength(1);

    model = createTeachingModel({ replaces: null, line: "  " });
    expect((await teach(body())).status).toBe(502);
  });

  it("guards the origin, the session, the body, the model and the rate limit", async () => {
    expect((await teach(body(), "https://evil.example")).status).toBe(403);
    expect((await teach({ ...body(), ai: { kind: "loan" } })).status).toBe(400);
    const buckets: string[] = [];
    const limited = await teach(body(), ORIGIN, {
      limitRequest: (bucket) => {
        buckets.push(bucket);
        return Promise.resolve({ success: false, reset: 0 });
      },
    });
    expect(limited.status).toBe(429);
    expect(buckets).toEqual(["ai-teach"]);
    model = null;
    expect((await teach(body())).status).toBe(503);
    session = null;
    expect((await teach(body())).status).toBe(401);
  });
});
