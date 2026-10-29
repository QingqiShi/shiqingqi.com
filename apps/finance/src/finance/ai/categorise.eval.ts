import { describe, expect, it } from "vitest";
import {
  categoriseFixture,
  type EvalCase,
  type LabelCase,
} from "./eval/categorise-fixture.ts";
import { meterFinanceModel } from "./eval/meter-finance-model.ts";
import { labelBankRows } from "./label-bank-rows.ts";

const {
  context,
  categoryPaths,
  withPast,
  withInstruction,
  cardPurchaseAfterDueDay,
  kindCases,
} = categoriseFixture;
const tagNames = new Map(context.tags.map((tag) => [tag.id, tag.name]));

/** Asks Jev for the label of the case's bank row alone, with the case's past Transactions. */
async function labelOf(evalCase: LabelCase) {
  const results = await labelBankRows(
    meterFinanceModel().model,
    context,
    [evalCase.row],
    () => Promise.resolve(evalCase.past),
  );
  const result = results.get(evalCase.row.ref);
  if (!result?.ok) throw new Error(result?.problem ?? "No result");
  return result.label;
}

async function categoryAndTagsOf(evalCase: EvalCase) {
  const label = await labelOf(evalCase);
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

  it("is sure that a large card purchase after the payment due day is an expense like its past Transactions", async () => {
    const label = await labelOf(cardPurchaseAfterDueDay);

    expect(label.kind).toBe("expense");
    expect(label.reason).not.toMatch(/Unsure of the kind/);
  });

  it.each(kindCases)(
    "gives the bank row $row.ref its kind",
    async (evalCase) => {
      const label = await labelOf(evalCase);

      const transfer =
        label.transfer?.type === "account" ? label.transfer.accountId : null;

      expect({ kind: label.kind, transfer }, label.reason).toEqual({
        kind: evalCase.kind,
        transfer: evalCase.transferAccountId ?? null,
      });
    },
  );
});
