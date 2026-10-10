import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  screen,
  userEvent,
  within,
} from "#src/testing/test-utils.tsx";
import { addDays } from "../domain/dates/add-days.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import type { FinanceRuntime } from "../replica/create-finance-runtime.ts";
import type { SyncRows } from "../sync/row-schemas.ts";
import {
  createTestReplica,
  TEST_IDS,
  testExpense,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { TransactionEditor } from "./transaction-editor.tsx";

const ids = TEST_IDS;
const UUID = /^[0-9a-f-]{36}$/;

const MORTGAGE = "00000000-0000-4000-8000-0000000000c9";
const LENDER = "00000000-0000-4000-8000-0000000000e9";
const PAYMENT = "00000000-0000-4000-8000-000000000109";
const PAYMENT_ENTRY = "00000000-0000-4000-8000-000000000208";
const LOAN_ENTRY = "00000000-0000-4000-8000-000000000209";
const EXPECTED = "00000000-0000-4000-8000-00000000010a";
const EXPECTED_ENTRY = "00000000-0000-4000-8000-00000000020a";

/** The test Household plus a mortgage paid from the current account: −£1,000, of which £600 pays the loan down. */
function rowsWithMortgage(): Partial<SyncRows> {
  const rows = testReplicaRows();
  const card = rows.accounts?.find((account) => account.id === ids.card);
  const lender = rows.payees?.at(0);
  if (!card || !lender) throw new Error("The test Household changed");
  const { transaction, entry } = testExpense(PAYMENT, PAYMENT_ENTRY, {
    date: "2026-09-01",
    amountMinor: -100_000,
    accountId: ids.current,
    payeeId: LENDER,
    categoryId: ids.transport,
  });
  return {
    ...rows,
    accounts: [
      ...(rows.accounts ?? []),
      { ...card, id: MORTGAGE, name: "Mortgage", kind: "loan", position: 1 },
    ],
    payees: [...(rows.payees ?? []), { ...lender, id: LENDER, name: "Lender" }],
    transactions: [...(rows.transactions ?? []), transaction],
    entries: [
      ...(rows.entries ?? []),
      entry,
      {
        ...entry,
        id: LOAN_ENTRY,
        accountId: MORTGAGE,
        amountMinor: 60_000,
        position: 1,
      },
    ],
  };
}

async function openEditor(
  props: Partial<Parameters<typeof TransactionEditor>[0]> = {},
  rows?: Partial<SyncRows>,
) {
  const runtime = await createTestReplica(rows);
  const onSaved = vi.fn();
  renderWithReplica(
    runtime,
    <TransactionEditor
      transactionId={null}
      onClose={() => undefined}
      onOpenTransaction={() => undefined}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { runtime, onSaved };
}

function outbox(runtime: FinanceRuntime) {
  return runtime.store.takeOutbox();
}

/** The one `createTransaction` in the Outbox, and the mutations before it. */
function created(runtime: FinanceRuntime) {
  const mutations = outbox(runtime);
  const last = mutations.at(-1);
  if (last?.name !== "createTransaction") {
    throw new Error("Expected a createTransaction last in the Outbox");
  }
  return { before: mutations.slice(0, -1), args: last.args };
}

const today = () => todayInTimeZone("Europe/London");

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("TransactionEditor", () => {
  it("saves an expense with everything from the Payee's last time", async () => {
    const { runtime, onSaved } = await openEditor();
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
    await userEvent.keyboard("12.50");
    await userEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    await userEvent.keyboard("tes{Enter}");

    expect(
      screen.getByRole("button", { name: /Groceries/, pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("From last time").length).toBeGreaterThan(0);
    await userEvent.keyboard("{Enter}");

    const { before, args } = created(runtime);
    expect(before).toEqual([]);
    expect(args).toMatchObject({
      kind: "expense",
      date: today(),
      amountMinor: -1_250,
      categoryId: ids.groceries,
      payeeId: ids.tesco,
      memberId: ids.sam,
      refundOfId: null,
      entries: [{ accountId: ids.card, amountMinor: -1_250, fxRate: null }],
      tagIds: [ids.weeklyShop],
    });
    expect(args.entries[0].id).toMatch(UUID);
    expect(onSaved).toHaveBeenCalledWith(args.id, false);
    expect(screen.getByRole("status")).toHaveTextContent("Added");
  });

  it("saves an income with a new Payee", async () => {
    const { runtime } = await openEditor({ initialKind: "income" });
    await userEvent.keyboard("2,000");
    await userEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    await userEvent.keyboard("Acme Ltd");
    await userEvent.click(screen.getByRole("button", { name: /Salary/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const { before, args } = created(runtime);
    const [payee] = before;
    if (payee.name !== "upsertPayee") throw new Error("Expected a new Payee");
    expect(payee.args.name).toBe("Acme Ltd");
    expect(args).toMatchObject({
      kind: "income",
      amountMinor: 200_000,
      categoryId: ids.salary,
      payeeId: payee.args.id,
      memberId: ids.alex,
      entries: [{ accountId: ids.current, amountMinor: 200_000 }],
    });
  });

  it("saves a transfer, with the second amount at the latest rate", async () => {
    const { runtime } = await openEditor({ initialKind: "transfer" });
    await userEvent.keyboard("500");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "From" }),
      ids.current,
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "To" }),
      ids.dollars,
    );
    expect(
      screen.getByRole("textbox", { name: /Amount received/ }),
    ).toHaveValue("625.00");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(created(runtime).args).toMatchObject({
      kind: "transfer",
      amountMinor: 0,
      categoryId: null,
      entries: [
        { accountId: ids.current, amountMinor: -50_000 },
        { accountId: ids.dollars, amountMinor: 62_500, fxRate: 1.25 },
      ],
    });
  });

  it("leaves the From account out of the To list", async () => {
    await openEditor({ initialKind: "transfer" });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "From" }),
      ids.current,
    );
    const to = screen.getByRole("combobox", { name: "To" });
    expect(
      within(to).queryByRole("option", { name: "Current account" }),
    ).toBeNull();
    expect(
      within(to).getByRole("option", { name: "Stocks ISA" }),
    ).toBeInTheDocument();
  });

  it("saves a refund linked to the original expense", async () => {
    const { runtime } = await openEditor();
    await userEvent.keyboard("5");
    await userEvent.click(screen.getByRole("button", { name: "Refund" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    await userEvent.keyboard("tesco{Enter}");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Refund of" }),
      ids.tescoShop,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(created(runtime).args).toMatchObject({
      kind: "expense",
      amountMinor: 500,
      refundOfId: ids.tescoShop,
      entries: [{ accountId: ids.card, amountMinor: 500 }],
    });
  });

  it("asks for an amount and a category before it saves", async () => {
    const { runtime } = await openEditor();
    await userEvent.keyboard("{Enter}");
    expect(
      screen.getByRole("textbox", { name: "Amount" }),
    ).toHaveAccessibleDescription("Enter an amount.");
    await userEvent.keyboard("3");
    await userEvent.keyboard("{Enter}");
    const category = screen.getByRole("group", { name: "Category" });
    expect(within(category).getByRole("alert")).toHaveTextContent(
      "Choose a category.",
    );
    expect(outbox(runtime)).toEqual([]);
  });

  it("patches only the changed fields of an existing Transaction, and Undo puts them back", async () => {
    const { runtime } = await openEditor({ transactionId: ids.tescoShop });
    const amount = screen.getByRole("textbox", { name: "Amount" });
    expect(amount).toHaveValue("42.10");
    await userEvent.clear(amount);
    await userEvent.type(amount, "45{Enter}");

    const [update] = outbox(runtime);
    if (update.name !== "updateTransaction")
      throw new Error("Expected a patch");
    expect(update.args).toEqual({
      id: ids.tescoShop,
      patch: {
        amountMinor: -4_500,
        entries: [
          {
            id: ids.tescoShopEntry,
            accountId: ids.card,
            amountMinor: -4_500,
            fxRate: null,
          },
        ],
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(outbox(runtime)).toMatchObject([
      {
        name: "updateTransaction",
        args: { id: ids.tescoShop, patch: { amountMinor: -4_210 } },
      },
    ]);
  });

  it("asks before it saves a likely duplicate", async () => {
    const { runtime } = await openEditor();
    await userEvent.keyboard("42.10");
    await userEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    await userEvent.keyboard("tesco{Enter}");
    fireEvent.change(screen.getByLabelText("Pick a date"), {
      target: { value: "2026-09-27" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Looks like a duplicate")).toBeInTheDocument();
    expect(outbox(runtime)).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "Keep both" }));
    expect(outbox(runtime)).toHaveLength(1);
  });

  it("focuses the amount of an existing Transaction", async () => {
    await openEditor({ transactionId: ids.tescoShop });
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  });

  it("keeps the loan Entry of a mortgage payment when only the note changes", async () => {
    const { runtime } = await openEditor(
      { transactionId: PAYMENT },
      rowsWithMortgage(),
    );
    expect(screen.getByRole("textbox", { name: "Amount repaid" })).toHaveValue(
      "600.00",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Note" }),
      "September",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(outbox(runtime)).toEqual([
      expect.objectContaining({
        name: "updateTransaction",
        args: { id: PAYMENT, patch: { note: "September" } },
      }),
    ]);
  });

  it("fills in the loan the Payee's last payment also paid down", async () => {
    const { runtime } = await openEditor({}, rowsWithMortgage());
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("combobox", { name: "Payee" }));
    await userEvent.keyboard("Lender{Enter}");
    expect(screen.getByRole("combobox", { name: "Loan or card" })).toHaveValue(
      MORTGAGE,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(created(runtime).args).toMatchObject({
      amountMinor: -100_000,
      entries: [
        { accountId: ids.current, amountMinor: -100_000 },
        { accountId: MORTGAGE, amountMinor: 60_000 },
      ],
    });
  });

  it("adds a pays-down Entry from the button", async () => {
    const { runtime } = await openEditor({}, rowsWithMortgage());
    await userEvent.keyboard("250");
    await userEvent.click(screen.getByRole("button", { name: /Transport/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Also pays down a loan or card" }),
    );
    const amount = screen.getByRole("textbox", { name: "Amount repaid" });
    expect(amount).toHaveValue("250");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(created(runtime).args.entries).toMatchObject([
      { amountMinor: -25_000 },
      { amountMinor: 10_000 },
    ]);
  });

  it("turns a purchase into an instalment plan, with Undo", async () => {
    const { runtime } = await openEditor({ transactionId: ids.tescoShop });
    await userEvent.click(
      screen.getByRole("button", { name: "Pay in instalments" }),
    );
    const months = screen.getByRole("textbox", { name: "Months" });
    await userEvent.clear(months);
    await userEvent.type(months, "3");
    expect(
      screen.getByText(/^3 monthly payments of £14\.03 \(this one £14\.04\)/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add plan" }));

    expect(outbox(runtime).map((mutation) => mutation.name)).toEqual([
      "upsertAccount",
      "putValuation",
      "updateTransaction",
      "upsertRule",
    ]);
    expect(
      screen.getByText(/^Instalment plan added · 3 monthly/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(outbox(runtime).map((mutation) => mutation.name)).toEqual([
      "upsertRule",
      "updateTransaction",
      "deleteValuation",
      "upsertAccount",
    ]);
  });

  it("confirms a future Expected row as paid today, and Undo makes it Expected again", async () => {
    const rows = testReplicaRows();
    const tomorrow = addDays(today(), 1);
    const { transaction, entry } = testExpense(EXPECTED, EXPECTED_ENTRY, {
      date: tomorrow,
      amountMinor: -1_099,
      accountId: ids.card,
      payeeId: ids.netflix,
      status: "expected",
    });
    const { runtime } = await openEditor(
      { transactionId: EXPECTED },
      {
        ...rows,
        transactions: [...(rows.transactions ?? []), transaction],
        entries: [...(rows.entries ?? []), entry],
      },
    );
    await userEvent.click(screen.getByRole("button", { name: "Paid today" }));
    expect(outbox(runtime)).toEqual([
      expect.objectContaining({
        name: "confirmExpected",
        args: { id: EXPECTED, patch: { date: today() } },
      }),
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(outbox(runtime)).toMatchObject([
      { name: "deleteTransaction", args: { id: EXPECTED } },
      {
        name: "createTransaction",
        args: { status: "expected", date: tomorrow, amountMinor: -1_099 },
      },
    ]);
  });

  it("clears Review from the bank callout", async () => {
    const rows = testReplicaRows();
    const { transaction, entry } = testExpense(EXPECTED, EXPECTED_ENTRY, {
      date: "2026-09-30",
      amountMinor: -315,
      accountId: ids.card,
      payeeId: ids.tesco,
      needsReview: true,
      aiConfidence: 0.95,
    });
    const { runtime } = await openEditor(
      { transactionId: EXPECTED },
      {
        ...rows,
        transactions: [...(rows.transactions ?? []), transaction],
        entries: [...(rows.entries ?? []), entry],
      },
    );
    await userEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(outbox(runtime)).toEqual([
      expect.objectContaining({
        name: "updateTransaction",
        args: { id: EXPECTED, patch: { needsReview: false } },
      }),
    ]);
  });

  it("says when a Transaction can't be found", async () => {
    await openEditor({ transactionId: "00000000-0000-4000-8000-0000000000ff" });
    expect(
      screen.getByText("This transaction can't be found."),
    ).toBeInTheDocument();
  });
});
