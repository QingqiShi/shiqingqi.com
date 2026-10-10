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

const { memory, categoryId, payeeId } = buildFixtureMemory();

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
      '0. 2026-10-01 · -10.00 GBP · Current (cash) · "TESCO EXPRESS"',
    );
    expect(text).toContain("Tesco · 餐饮 > 超市");
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
      [input("known", "TESCO STORES 3297"), input("new", "LIDL GB")],
      { model },
    );

    expect(result.get("known")).toMatchObject({
      payeeId: payeeId("Tesco"),
      source: "history",
    });
    expect(result.get("new")).toMatchObject({
      newPayeeName: "Lidl",
      source: "model",
    });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(userText(model.doGenerateCalls[0].prompt)).not.toContain(
      "TESCO STORES 3297",
    );
  });

  it("keeps the memory answers when the model fails", async () => {
    const errors: unknown[] = [];
    const model = new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("upstream failure")),
    });

    const result = await suggestLabelsBatch(
      memory,
      [input("known", "NETFLIX.COM"), input("new", "LIDL GB")],
      { model, onModelError: (error) => errors.push(error) },
    );

    expect([...result.keys()]).toEqual(["known"]);
    expect(errors).toHaveLength(1);
  });
});
