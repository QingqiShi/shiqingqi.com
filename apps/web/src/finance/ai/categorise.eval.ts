import { describe, expect, it } from "vitest";
import { categoriseFixture, type EvalCase } from "./eval/categorise-fixture.ts";
import { meterFinanceModel } from "./eval/meter-finance-model.ts";
import { labelBankRows } from "./label-bank-rows.ts";

const { context, categoryPaths, withPast, withInstruction } = categoriseFixture;
const tagNames = new Map(context.tags.map((tag) => [tag.id, tag.name]));

/** Asks Jev for the labels of the case's bank row, with the case's past Transactions. */
async function categoryAndTagsOf(evalCase: EvalCase) {
  const results = await labelBankRows(
    meterFinanceModel().model,
    context,
    [evalCase.row],
    () => Promise.resolve(evalCase.past),
  );
  const result = results.get(evalCase.row.ref);
  if (!result?.ok) throw new Error(result?.problem ?? "No result");
  const { label } = result;
  return {
    labels: {
      category: categoryPaths.get(label.categoryId ?? "") ?? label.kind,
      tags: label.tagIds.map((tagId) => tagNames.get(tagId)),
    },
    reason: label.reason,
  };
}

describe("Finance labelling (real model)", () => {
  it("gives a bank row the category and tags of its similar past Transactions", async () => {
    const { labels, reason } = await categoryAndTagsOf(withPast);

    expect(labels, reason).toEqual({
      category: withPast.category,
      tags: withPast.tags,
    });
  });

  it("gives a bank row with no past Transactions the category and tags its instruction says", async () => {
    const { labels, reason } = await categoryAndTagsOf(withInstruction);

    expect(labels, reason).toEqual({
      category: withInstruction.category,
      tags: withInstruction.tags,
    });
  });
});
