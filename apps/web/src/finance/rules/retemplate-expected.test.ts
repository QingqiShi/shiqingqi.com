import { describe, expect, it } from "vitest";
import { retemplateExpected } from "./retemplate-expected.ts";
import type { RuleTemplate } from "./rule-template-schema.ts";

const before: RuleTemplate = {
  kind: "expense",
  amountMinor: -1_000,
  categoryId: "groceries",
  payeeId: "grocer",
  memberId: null,
  note: "",
  entries: [{ accountId: "current", amountMinor: -1_000 }],
  tagIds: [],
};
const after: RuleTemplate = {
  ...before,
  amountMinor: -1_500,
  categoryId: "dining",
  payeeId: "cafe",
  entries: [{ accountId: "card", amountMinor: -1_500 }],
};
const newEntryId = (row: { id: string }, position: number) =>
  `${row.id}:${String(position)}`;

function row(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    date: "2026-10-15",
    kind: before.kind,
    amountMinor: before.amountMinor,
    categoryId: before.categoryId,
    payeeId: before.payeeId,
    memberId: before.memberId,
    note: before.note,
    entries: [
      {
        id: `${id}-entry`,
        accountId: "current",
        amountMinor: -1_000,
        fxRate: null,
      },
    ],
    tagIds: [],
    ...fields,
  };
}

describe("retemplateExpected", () => {
  it("moves an upcoming Expected Transaction to the new account, keeping its Entry id", () => {
    expect(retemplateExpected(before, after, [row("a")], newEntryId)).toEqual([
      {
        id: "a",
        patch: {
          amountMinor: -1_500,
          categoryId: "dining",
          payeeId: "cafe",
          entries: [
            {
              id: "a-entry",
              accountId: "card",
              amountMinor: -1_500,
              fxRate: null,
            },
          ],
        },
      },
    ]);
  });

  it("keeps a field that a Member changed on one Transaction when the template keeps it", () => {
    const payeeOnly = { ...before, payeeId: "cafe" };
    const changes = retemplateExpected(
      before,
      payeeOnly,
      [row("a", { note: "Birthday", amountMinor: -2_000 })],
      newEntryId,
    );
    expect(changes).toEqual([{ id: "a", patch: { payeeId: "cafe" } }]);
  });

  it("moves the amount with the account, so that they agree", () => {
    const accountOnly = {
      ...before,
      entries: [{ accountId: "card", amountMinor: -1_000 }],
    };
    const changes = retemplateExpected(
      before,
      accountOnly,
      [
        row("a", {
          amountMinor: -2_000,
          entries: [
            {
              id: "a-entry",
              accountId: "current",
              amountMinor: -2_000,
              fxRate: null,
            },
          ],
        }),
      ],
      newEntryId,
    );
    expect(changes[0].patch).toEqual({
      amountMinor: -1_000,
      entries: [
        { id: "a-entry", accountId: "card", amountMinor: -1_000, fxRate: null },
      ],
    });
  });

  it("leaves a Transaction that a Member gave another kind", () => {
    const changes = retemplateExpected(
      before,
      after,
      [row("refund", { kind: "income", categoryId: "salary" })],
      newEntryId,
    );
    expect(changes).toEqual([]);
  });

  it("adds an Entry for a position the Transaction has none for", () => {
    const split: RuleTemplate = {
      ...before,
      entries: [
        { accountId: "current", amountMinor: -600 },
        { accountId: "card", amountMinor: -400 },
      ],
    };
    const [change] = retemplateExpected(before, split, [row("a")], newEntryId);
    expect(change.patch).toEqual({
      entries: [
        {
          id: "a-entry",
          accountId: "current",
          amountMinor: -600,
          fxRate: null,
        },
        { id: "a:1", accountId: "card", amountMinor: -400, fxRate: null },
      ],
    });
  });

  it("changes nothing when the template stays the same", () => {
    expect(
      retemplateExpected(
        before,
        before,
        [row("a", { note: "Old" })],
        newEntryId,
      ),
    ).toEqual([]);
  });
});
