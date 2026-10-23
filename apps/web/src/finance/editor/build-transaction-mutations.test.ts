import { describe, expect, it } from "vitest";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import {
  TEST_IDS,
  testExpense,
} from "../transactions/testing/create-test-replica.ts";
import {
  buildTransactionMutations,
  type BuildMutationsContext,
} from "./build-transaction-mutations.ts";
import { editorDraft, type EditorDraft } from "./editor-draft.ts";

const ids = TEST_IDS;
const MORTGAGE = "00000000-0000-4000-8000-0000000000c9";
const LOAN_ENTRY = "00000000-0000-4000-8000-000000000209";
const PAYMENT = "00000000-0000-4000-8000-000000000109";
const PAYMENT_ENTRY = "00000000-0000-4000-8000-000000000208";

const accountById = new Map([
  [ids.current, { currency: "GBP" }],
  [ids.card, { currency: "GBP" }],
  [ids.dollars, { currency: "USD" }],
  [MORTGAGE, { currency: "GBP" }],
]);

let counter = 0;
function context(
  transaction: TransactionRow,
  entries: EntryRow[],
): BuildMutationsContext {
  return {
    target: { type: "update", existing: transaction, entries, tagIds: [] },
    accountById,
    payees: [],
    baseCurrency: "GBP",
    createId: () => {
      counter++;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
    },
  };
}

/** A mortgage payment as the importer writes it: −£1,000 from the current account, +£600 on the mortgage. */
function mortgagePayment(status: "posted" | "expected" = "posted") {
  const { transaction, entry } = testExpense(PAYMENT, PAYMENT_ENTRY, {
    date: "2026-09-01",
    amountMinor: -100_000,
    accountId: ids.current,
    categoryId: ids.groceries,
    status,
  });
  const loanEntry: EntryRow = {
    ...entry,
    id: LOAN_ENTRY,
    accountId: MORTGAGE,
    amountMinor: 60_000,
    position: 1,
  };
  const draft: EditorDraft = editorDraft("expense", "2026-09-01", {
    amountText: "1000.00",
    accountId: ids.current,
    categoryId: ids.groceries,
    paysDownAccountId: MORTGAGE,
    paysDownAmountText: "600.00",
  });
  return { transaction, entries: [entry, loanEntry], draft };
}

describe("buildTransactionMutations on an existing Transaction", () => {
  it("keeps an Entry the editor does not show when the amount changes", () => {
    const { transaction, entries, draft } = mortgagePayment();
    const result = buildTransactionMutations(
      { ...draft, amountText: "1100", paysDownAccountId: null },
      context(transaction, [
        entries[0],
        { ...entries[1], amountMinor: -60_000 },
      ]),
    );
    if (!result.ok) throw new Error("Expected a save");
    expect(result.mutations[0]).toMatchObject({
      name: "updateTransaction",
      args: {
        patch: {
          entries: [
            {
              id: PAYMENT_ENTRY,
              accountId: ids.current,
              amountMinor: -110_000,
            },
            { id: LOAN_ENTRY, accountId: MORTGAGE, amountMinor: -60_000 },
          ],
        },
      },
    });
  });

  it("changes the repaid part, and Undo puts both Entries back", () => {
    const { transaction, entries, draft } = mortgagePayment();
    const result = buildTransactionMutations(
      { ...draft, paysDownAmountText: "650" },
      context(transaction, entries),
    );
    if (!result.ok) throw new Error("Expected a save");
    expect(result.mutations[0]).toEqual({
      name: "updateTransaction",
      args: {
        id: PAYMENT,
        patch: {
          entries: [
            {
              id: PAYMENT_ENTRY,
              accountId: ids.current,
              amountMinor: -100_000,
            },
            {
              id: LOAN_ENTRY,
              accountId: MORTGAGE,
              amountMinor: 65_000,
            },
          ],
        },
      },
    });
    expect(result.undo[0]).toMatchObject({
      args: {
        patch: {
          entries: [
            { id: PAYMENT_ENTRY, amountMinor: -100_000 },
            { id: LOAN_ENTRY, amountMinor: 60_000 },
          ],
        },
      },
    });
  });

  it("confirms an Expected occurrence of a mortgage Rule with its loan Entry, and Undo makes it Expected again", () => {
    const { transaction, entries, draft } = mortgagePayment("expected");
    const result = buildTransactionMutations(
      draft,
      context(transaction, entries),
    );
    if (!result.ok) throw new Error("Expected a save");
    expect(result.mutations).toEqual([
      { name: "confirmExpected", args: { id: PAYMENT, patch: {} } },
    ]);
    expect(result.undo).toMatchObject([
      { name: "deleteTransaction", args: { id: PAYMENT } },
      {
        name: "createTransaction",
        args: {
          status: "expected",
          date: "2026-09-01",
          entries: [
            { accountId: ids.current, amountMinor: -100_000 },
            { accountId: MORTGAGE, amountMinor: 60_000 },
          ],
        },
      },
    ]);
  });

  it("adds a pays-down Entry to a plain expense", () => {
    const { transaction, entries, draft } = mortgagePayment();
    const result = buildTransactionMutations(draft, {
      ...context(transaction, [entries[0]]),
    });
    if (!result.ok) throw new Error("Expected a save");
    expect(result.mutations[0]).toMatchObject({
      args: {
        patch: {
          entries: [
            { id: PAYMENT_ENTRY, amountMinor: -100_000 },
            { accountId: MORTGAGE, amountMinor: 60_000 },
          ],
        },
      },
    });
  });

  it("refuses a pays-down Entry on the paying account", () => {
    const { transaction, entries, draft } = mortgagePayment();
    const result = buildTransactionMutations(
      { ...draft, paysDownAccountId: ids.current },
      context(transaction, entries),
    );
    expect(result).toEqual({ ok: false, errors: { paysDown: "sameAccount" } });
  });
});

describe("buildTransactionMutations in another currency", () => {
  const { transaction, entry } = testExpense(PAYMENT, PAYMENT_ENTRY, {
    date: "2026-03-01",
    amountMinor: -1_000,
    accountId: ids.dollars,
  });
  const draft = editorDraft("expense", "2026-03-01", {
    amountText: "10.00",
    accountId: ids.dollars,
    categoryId: ids.groceries,
  });

  it("changes only the date when the date changes", () => {
    const result = buildTransactionMutations(
      { ...draft, date: "2026-09-02" },
      context(transaction, [entry]),
    );
    if (!result.ok) throw new Error("Expected a save");
    expect(result.mutations).toEqual([
      {
        name: "updateTransaction",
        args: { id: PAYMENT, patch: { date: "2026-09-02" } },
      },
    ]);
  });
});
