import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
  buildFixtureMemory,
  FIXTURE_ACCOUNT_ID,
} from "./eval/build-fixture-memory.ts";
import { suggestLabelsBatch } from "./suggest-labels-batch.ts";
import { suggestLabelsWithModel } from "./suggest-labels-with-model.ts";
import {
  createLabellingModel,
  userText,
} from "./testing/create-labelling-model.ts";
import type { LabelMemory, MemoryTransaction } from "./types.ts";

const { memory, categoryId, payeeId } = buildFixtureMemory();
const [subwayTag, trainTag, treatTag] = memory.tags.map((tag) => tag.id);

function past(
  id: string,
  overrides: Partial<MemoryTransaction>,
): MemoryTransaction {
  return {
    id,
    date: "2026-09-20",
    kind: "expense",
    amountMinor: -1000,
    payeeId: null,
    categoryId: categoryId("takeaway"),
    memberId: null,
    tagIds: [],
    accountIds: [FIXTURE_ACCOUNT_ID],
    bankTexts: [],
    ...overrides,
  };
}

function withPast(transactions: MemoryTransaction[]): LabelMemory {
  return {
    ...memory,
    transactions: [...transactions, ...memory.transactions],
  };
}

function input(key: string, text: string, amountMinor = -1000) {
  return {
    key,
    text,
    amountMinor,
    date: "2026-10-01",
    accountId: FIXTURE_ACCOUNT_ID,
  };
}

describe("suggestLabelsWithModel", () => {
  it("maps the model's answer onto Payees, Tags and Members", async () => {
    const model = createLabellingModel((text) =>
      text === "UBER *EATS"
        ? {
            payeeName: "uber eats",
            categoryId: categoryId("takeaway"),
            tagIds: [memory.tags[0].id, "made-up"],
            memberId: "not-a-member",
            confidence: 1.4,
          }
        : {
            payeeName: "Netflix",
            categoryId: categoryId("subscriptions"),
            memberId: memory.members[0].id,
            confidence: 0.92,
          },
    );

    const result = await suggestLabelsWithModel(model, memory, [
      input("a", "UBER *EATS"),
      input("b", "NFLX DIGITAL"),
    ]);

    expect(result.get("a")).toEqual({
      payeeId: undefined,
      newPayeeName: "uber eats",
      categoryId: categoryId("takeaway"),
      tagIds: [memory.tags[0].id],
      memberId: undefined,
      confidence: 1,
      source: "model",
    });
    expect(result.get("b")).toMatchObject({
      payeeId: payeeId("Netflix"),
      newPayeeName: undefined,
      memberId: memory.members[0].id,
      confidence: 0.92,
    });
  });

  it("caches the Household part of the prompt and sends the inputs in the message", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "Tesco",
      categoryId: categoryId("groceries"),
      confidence: 0.9,
    }));

    await suggestLabelsWithModel(model, memory, [input("a", "TESCO EXPRESS")]);

    const [call] = model.doGenerateCalls;
    const system = call.prompt.find((message) => message.role === "system");
    expect(system?.content).toContain(
      `${categoryId("groceries")} | expense | 餐饮 > 超市`,
    );
    expect(system?.providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
    const text = userText(call.prompt);
    expect(text).toContain(
      '0. 2026-10-01 Thu · -10.00 GBP · Current (cash) · "TESCO EXPRESS"',
    );
    expect(text).toContain("Tesco · 餐饮 > 超市");
  });

  it("shows the bank texts of the most alike past Transactions", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "TfL",
      categoryId: categoryId("public-transport"),
      confidence: 0.9,
    }));

    await suggestLabelsWithModel(model, memory, [
      input("a", "TFL TRAVEL CHARGE"),
    ]);

    expect(userText(model.doGenerateCalls[0].prompt)).toContain(
      '"TFL TRAVEL CH" · TfL · 出行 > 公共交通',
    );
  });

  it("shows every Category that past rows with the same bank text had, with their amounts and weekdays", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "",
      categoryId: categoryId("public-transport"),
      confidence: 0.6,
    }));
    const fares = withPast([
      past("weekday", {
        date: "2026-09-22",
        amountMinor: -720,
        categoryId: categoryId("public-transport"),
        bankTexts: ["BUS AND RAIL"],
      }),
      past("weekend", {
        date: "2026-09-20",
        amountMinor: -330,
        categoryId: categoryId("entertainment"),
        bankTexts: ["BUS AND RAIL"],
      }),
    ]);

    await suggestLabelsWithModel(model, fares, [
      input("a", "BUS AND RAIL", -330),
    ]);

    const text = userText(model.doGenerateCalls[0].prompt);
    expect(text).toContain(
      '2026-09-22 Tue · "BUS AND RAIL" ·  · 出行 > 公共交通 ·  · -7.20',
    );
    expect(text).toContain(
      '2026-09-20 Sun · "BUS AND RAIL" ·  · 娱乐 ·  · -3.30',
    );
    const system = model.doGenerateCalls[0].prompt.find(
      (message) => message.role === "system",
    );
    expect(system?.content).toContain("Never guess a tag that changes");
  });

  it("drops a Tag that changes between past rows with the same bank text or Payee, and asks for Tags", async () => {
    const model = createLabellingModel((text) => ({
      payeeName: text === "DELIVEROO ORDER" ? "Deliveroo" : "",
      categoryId: categoryId("takeaway"),
      tagIds: [subwayTag, trainTag, treatTag],
      confidence: 0.9,
    }));
    const orders = withPast([
      past("o1", { bankTexts: ["FOOD APP"], tagIds: [subwayTag, treatTag] }),
      past("o2", { bankTexts: ["FOOD APP"], tagIds: [trainTag, treatTag] }),
      past("o3", { bankTexts: ["FOOD APP"], tagIds: [subwayTag, treatTag] }),
      past("d1", { payeeId: payeeId("Deliveroo"), tagIds: [subwayTag] }),
      past("d2", { payeeId: payeeId("Deliveroo"), tagIds: [trainTag] }),
      past("d3", { payeeId: payeeId("Deliveroo"), tagIds: [subwayTag] }),
      past("d4", { payeeId: payeeId("Deliveroo"), tagIds: [trainTag] }),
    ]);

    const result = await suggestLabelsWithModel(model, orders, [
      input("text", "FOOD APP"),
      input("payee", "DELIVEROO ORDER"),
      input("new", "NOODLE BAR"),
    ]);

    expect(result.get("text")).toMatchObject({
      tagIds: [treatTag],
      askForTags: true,
    });
    expect(result.get("payee")).toMatchObject({
      payeeId: payeeId("Deliveroo"),
      tagIds: [treatTag],
      askForTags: true,
    });
    expect(result.get("new")?.tagIds).toEqual([subwayTag, trainTag, treatTag]);
    expect(result.get("new")?.askForTags).toBeUndefined();
  });

  it("keeps the usual Payee, or none, of past rows with the same bank text and Category", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "Bus Company",
      categoryId: categoryId("public-transport"),
      confidence: 0.9,
    }));
    const fares = withPast([
      past("f1", {
        categoryId: categoryId("public-transport"),
        bankTexts: ["BUS AND RAIL"],
      }),
    ]);

    const result = await suggestLabelsWithModel(model, fares, [
      input("a", "BUS AND RAIL"),
    ]);

    expect(result.get("a")).toMatchObject({
      payeeId: undefined,
      newPayeeName: undefined,
    });
  });

  it("asks for a bounded answer without reasoning", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "Tesco",
      categoryId: categoryId("groceries"),
      confidence: 0.9,
    }));

    await suggestLabelsWithModel(model, memory, [input("a", "TESCO EXPRESS")]);

    const [call] = model.doGenerateCalls;
    expect(call).toMatchObject({ reasoning: "none", maxOutputTokens: 4096 });
  });

  it("rejects a category id that is not the Household's", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "Tesco",
      categoryId: "not-a-category",
      confidence: 0.9,
    }));

    await expect(
      suggestLabelsWithModel(model, memory, [input("a", "TESCO EXPRESS")]),
    ).rejects.toThrow();
  });
});

describe("suggestLabelsBatch", () => {
  it("asks the model only for what memory cannot label", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "Lidl",
      categoryId: categoryId("groceries"),
      confidence: 0.85,
    }));

    const result = await suggestLabelsBatch(
      memory,
      [input("known", "OCADO RETAIL LTD 22"), input("new", "LIDL GB")],
      { model },
    );

    expect(result.get("known")).toMatchObject({
      payeeId: payeeId("Ocado"),
      source: "bank-text",
    });
    expect(result.get("new")).toMatchObject({
      newPayeeName: "Lidl",
      source: "model",
    });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(userText(model.doGenerateCalls[0].prompt)).not.toContain(
      "OCADO RETAIL LTD 22",
    );
  });

  it("asks the model when past rows with the same bank text disagree on the Category", async () => {
    const model = createLabellingModel(() => ({
      payeeName: "",
      categoryId: categoryId("entertainment"),
      confidence: 0.85,
    }));
    const fares = withPast([
      past("f1", {
        categoryId: categoryId("public-transport"),
        bankTexts: ["BUS AND RAIL"],
      }),
      past("f2", {
        categoryId: categoryId("entertainment"),
        bankTexts: ["BUS AND RAIL"],
      }),
      past("f3", {
        categoryId: categoryId("public-transport"),
        bankTexts: ["BUS AND RAIL"],
      }),
    ]);

    const result = await suggestLabelsBatch(
      fares,
      [input("fare", "BUS AND RAIL")],
      { model },
    );

    expect(result.get("fare")).toMatchObject({
      categoryId: categoryId("entertainment"),
      confidence: 0.85,
      source: "model",
    });
  });

  it("keeps the memory answers when the model fails", async () => {
    const errors: unknown[] = [];
    const model = new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("upstream failure")),
    });
    const fares = withPast([
      past("f1", {
        categoryId: categoryId("public-transport"),
        bankTexts: ["BUS AND RAIL"],
      }),
      past("f2", {
        categoryId: categoryId("entertainment"),
        bankTexts: ["BUS AND RAIL"],
      }),
    ]);

    const result = await suggestLabelsBatch(
      fares,
      [
        input("known", "OCADO RETAIL LTD"),
        input("split", "BUS AND RAIL"),
        input("new", "LIDL GB"),
      ],
      { model, onModelError: (error) => errors.push(error) },
    );

    expect([...result.keys()]).toEqual(["known", "split"]);
    expect(result.get("split")).toMatchObject({
      categoryId: categoryId("public-transport"),
      confidence: 0.7,
      source: "bank-text",
    });
    expect(errors).toHaveLength(1);
  });
});
