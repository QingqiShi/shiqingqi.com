import { randomUUID } from "node:crypto";
import {
  TypeSafeClient,
  type ChoiceResponse,
  type NoulResponse,
  type Question,
} from "@typesafe-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import {
  makeQuickAddHandler,
  type QuickAddHandlerDependencies,
} from "./make-quick-add-handler.ts";
import {
  TEST_CLIENT,
  createFailingLabellingModel,
} from "./testing/create-labelling-model.ts";
import type { QuickAddResponse } from "./types.ts";

const ORIGIN = "https://qingqi.dev";
const NOW = new Date("2026-11-01T12:00:00Z");

/** The label a fake Jev chooses for a question, with the probability it gives it and the label it gives the rest. */
interface FakeAnswer {
  choice: string;
  probability?: number;
  runnerUp?: string;
}

/**
 * A fake Jev behind the real client: it answers each Choice question named in
 * `answers` as given, and any other with its first label, sure of it.
 */
function createQuickAddModel(answers: Record<string, FakeAnswer>) {
  const requests: { questions: Record<string, Question> }[] = [];
  const client = new TypeSafeClient({
    ...TEST_CLIENT,
    fetch: (_url, init) => {
      const body = typeof init?.body === "string" ? init.body : "{}";
      const request = JSON.parse(body) as (typeof requests)[0];
      requests.push(request);
      const response: Record<string, ChoiceResponse | NoulResponse> = {};
      for (const [id, question] of Object.entries(request.questions)) {
        if (question.type !== "choice") {
          response[id] = { type: "noul", noul: 0 };
          continue;
        }
        const labels = Object.keys(question.criteria);
        const given = answers[id] ?? { choice: labels[0] };
        const probability = given.probability ?? 1;
        const probabilities = Object.fromEntries(
          labels.map((label) => [
            label,
            label === given.choice
              ? probability
              : label === given.runnerUp
                ? 1 - probability
                : 0,
          ]),
        );
        response[id] = {
          type: "choice",
          choice: given.choice,
          confidence: probability,
          probabilities,
        };
      }
      return Promise.resolve(
        Response.json({
          model: "jev-test",
          answers: response,
          usage: { input_tokens: 10, output_tokens: 0 },
        }),
      );
    },
  });
  return Object.assign(client, { requests });
}

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;
let model: ReturnType<typeof createQuickAddModel> | null;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
    readOnly: false,
  };
  model = createQuickAddModel({});
});

afterEach(async () => {
  await db.close();
});

function quickAdd(
  body: unknown,
  origin = ORIGIN,
  overrides: Partial<QuickAddHandlerDependencies> = {},
) {
  const handler = makeQuickAddHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    getModel: () => model,
    now: () => NOW,
    ...overrides,
  });
  return handler(
    new Request(`${ORIGIN}/api/ai/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    }),
  );
}

describe("makeQuickAddHandler", () => {
  it("guards the origin, the session, the body and the model", async () => {
    expect(
      (await quickAdd({ text: "grocer 12" }, "https://evil.example")).status,
    ).toBe(403);
    expect((await quickAdd({ text: "  " })).status).toBe(400);
    expect((await quickAdd({ text: "x".repeat(1001) })).status).toBe(400);
    model = null;
    expect((await quickAdd({ text: "grocer 12" })).status).toBe(503);
    session = null;
    expect((await quickAdd({ text: "grocer 12" })).status).toBe(401);
  });

  it("limits how often a member asks the model", async () => {
    const buckets: string[] = [];

    const response = await quickAdd({ text: "grocer 12" }, ORIGIN, {
      limitRequest: (bucket) => {
        buckets.push(bucket);
        return Promise.resolve({ success: false, reset: 0 });
      },
    });

    expect(response.status).toBe(429);
    expect(buckets).toEqual(["ai-quick-add"]);
    expect(model?.requests ?? []).toHaveLength(0);
  });

  it("answers 502 when the model fails", async () => {
    const errors: unknown[] = [];

    const response = await quickAdd({ text: "grocer 12" }, ORIGIN, {
      getModel: () => createFailingLabellingModel(),
      onModelError: (error) => errors.push(error),
    });

    expect(response.status).toBe(502);
    expect(errors).toHaveLength(1);
  });

  it("gives each field Jev's answer with its probability and runner-up, and the amount the text alone has", async () => {
    model = createQuickAddModel({
      kind: { choice: "expense", probability: 0.9, runnerUp: "transfer" },
      date: { choice: "2026-10-31 (Saturday)" },
      account: { choice: "Card", probability: 0.55, runnerUp: "Current" },
      expenseCategory: { choice: "Groceries" },
      payee: { choice: "Grocer" },
    });
    const text = " Grocer 12.50 yesterday ";

    const response = await quickAdd({ text });

    expect(response.status).toBe(200);
    const body = (await response.json()) as QuickAddResponse;
    expect(body).toMatchObject({
      text,
      kind: { value: "expense", probability: 0.9, runnerUp: "transfer" },
      amountMinor: { value: 1250, probability: 1 },
      date: { value: "2026-10-31", probability: 1 },
      accountId: {
        value: home.cardId,
        probability: 0.55,
        runnerUp: home.currentId,
      },
      expenseCategoryId: { value: home.groceriesId },
      payee: { value: { id: home.grocerId } },
      tagIds: [],
    });
  });
});
