import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextPopState } from "#src/testing/next-pop-state.ts";
import {
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from "#src/testing/test-utils.tsx";
import { ColumnLink, useColumnReplace } from "../navigation/column-link.tsx";
import { readNetWorth } from "../navigation/finance-href.ts";
import { financeNavigator } from "../navigation/finance-navigator.ts";
import type { FinanceRuntime } from "../replica/create-finance-runtime.ts";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { editorDraft } from "./editor-draft.ts";
import {
  NewTransactionTask,
  useTransactionTask,
  type TransactionTask,
} from "./use-transaction-task.tsx";

const ids = TEST_IDS;

/** Net worth's columns: the account of `?account=`, and its Ledger's Transaction of `&tx=` in the detail. */
function NetWorth() {
  const { account, tx } = readNetWorth(useSearchParams());
  const task = useTransactionTask({ screen: "netWorth", account });
  const replace = useColumnReplace();
  return (
    <>
      <NavigationSplitView
        linkComponent={ColumnLink}
        replace={replace}
        closeLabel="Close"
        content={{ label: "Account", node: <p>Ledger</p> }}
        detail={
          account !== null && tx !== null
            ? {
                label: "Transaction",
                key: tx,
                back: { href: `/finance?account=${account}`, label: "Card" },
                node: task.detail(tx),
              }
            : null
        }
      />
      {task.sheet}
    </>
  );
}

/** The Transactions screen's columns, with `task` for the list's own controls. */
function Transactions({ onTask }: { onTask: (task: TransactionTask) => void }) {
  const id = useSearchParams().get("id");
  const task = useTransactionTask({ screen: "transactions" });
  onTask(task);
  const replace = useColumnReplace();
  return (
    <>
      <NavigationSplitView
        linkComponent={ColumnLink}
        replace={replace}
        closeLabel="Close"
        content={{ label: "Transactions", node: <p>List</p> }}
        detail={
          id === null
            ? null
            : {
                label: "Transaction",
                key: id,
                back: { href: "/finance/transactions", label: "List" },
                node: task.detail(id),
              }
        }
      />
      {task.sheet}
    </>
  );
}

async function renderAt(href: string, ui: ReactElement) {
  window.history.replaceState(window.history.state, "", href);
  const runtime = await createTestReplica();
  return {
    runtime,
    ...renderWithReplica(runtime, ui, { followsHistory: true }),
  };
}

async function renderTransactions(href: string) {
  let task: TransactionTask | null = null;
  const view = await renderAt(
    href,
    <Transactions
      onTask={(next) => {
        task = next;
      }}
    />,
  );
  const current = () => {
    if (task === null) throw new Error("The Transactions screen did not draw");
    return task;
  };
  return { ...view, task: current };
}

/** The first chip of the Category, which takes focus for the category. */
function firstCategory(within_: HTMLElement) {
  const [chip] = within(
    within(within_).getByRole("group", { name: "Category" }),
  ).getAllByRole("button");
  return chip;
}

/** The Refund action of an expense, which the Refund chip of the kind does not count as. */
function refundAction(editor: HTMLElement) {
  const action = within(editor)
    .getAllByRole("button", { name: "Refund" })
    .find((button) => !button.hasAttribute("aria-pressed"));
  if (!action) throw new Error("The editor has no Refund action");
  return action;
}

function outbox(runtime: FinanceRuntime) {
  return runtime.store.takeOutbox();
}

const newSheet = () => screen.findByRole("dialog", { name: "New transaction" });

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  window.history.replaceState(null, "", "/finance");
});

describe("useTransactionTask on Net worth", () => {
  it("opens a refund over the account, and its close comes back to the Ledger's Transaction", async () => {
    window.history.replaceState(null, "", `/finance?account=${ids.card}`);
    window.history.pushState(
      null,
      "",
      `/finance?account=${ids.card}&tx=${ids.tescoShop}`,
    );
    await renderAt(window.location.href, <NetWorth />);

    const transaction = screen.getByRole("region", { name: "Transaction" });
    await userEvent.click(refundAction(transaction));

    expect(window.location.search).toBe(
      `?account=${ids.card}&new=expense&refund=${ids.tescoShop}`,
    );
    const sheet = await newSheet();
    expect(
      within(sheet).getByRole("textbox", { name: "Amount refunded" }),
    ).toBeVisible();

    const popped = nextPopState();
    await userEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    await popped;
    expect(window.location.search).toBe(
      `?account=${ids.card}&tx=${ids.tescoShop}`,
    );
    expect(
      await screen.findByRole("region", { name: "Transaction" }),
    ).toBeVisible();
  });

  it("opens a new expense on the account after a save that asks for one", async () => {
    const { runtime } = await renderAt(
      `/finance?account=${ids.card}&tx=${ids.tescoShop}`,
      <NetWorth />,
    );

    const amount = within(
      screen.getByRole("region", { name: "Transaction" }),
    ).getByRole("textbox", { name: "Amount" });
    await userEvent.clear(amount);
    await userEvent.type(amount, "43.10{Control>}{Enter}{/Control}");

    expect(outbox(runtime).at(-1)).toMatchObject({
      name: "updateTransaction",
    });
    expect(window.location.search).toBe(`?account=${ids.card}&new=expense`);
    const sheet = await newSheet();
    expect(
      await within(sheet).findByRole("combobox", { name: "Account" }),
    ).toHaveValue(ids.card);
  });

  it("starts a new expense on the account of the page, and a save leaves the page as it was", async () => {
    const { runtime } = await renderAt(
      `/finance?account=${ids.current}&new=expense`,
      <NetWorth />,
    );

    const sheet = await newSheet();
    expect(
      await within(sheet).findByRole("combobox", { name: "Account" }),
    ).toHaveValue(ids.current);
    await userEvent.keyboard("4.20");
    await userEvent.click(
      within(sheet).getByRole("button", { name: /Groceries/ }),
    );
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));

    expect(outbox(runtime).at(-1)).toMatchObject({
      name: "createTransaction",
      args: { entries: [{ accountId: ids.current, amountMinor: -420 }] },
    });
    expect(window.location.pathname).toBe("/finance");
    expect(window.location.search).toBe(`?account=${ids.current}`);
  });

  it("keeps the new expense on the account after Save and add another", async () => {
    const { runtime } = await renderAt(
      `/finance?account=${ids.current}&new=expense`,
      <NetWorth />,
    );

    const sheet = await newSheet();
    await userEvent.keyboard("4.20");
    await userEvent.click(
      within(sheet).getByRole("button", { name: /Groceries/ }),
    );
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Save and add another" }),
    );

    expect(outbox(runtime).at(-1)).toMatchObject({
      name: "createTransaction",
    });
    expect(window.location.search).toBe(`?account=${ids.current}&new=expense`);
    expect(within(sheet).getByRole("textbox", { name: "Amount" })).toHaveValue(
      "",
    );
    expect(
      within(sheet).getByRole("combobox", { name: "Account" }),
    ).toHaveValue(ids.current);
  });

  it("goes back when the Add action opened it", async () => {
    window.history.replaceState(null, "", `/finance?account=${ids.card}`);
    financeNavigator(
      { push: () => undefined, replace: () => undefined },
      "en",
    ).open({
      screen: "netWorth",
      account: ids.card,
      newTransaction: { kind: "expense" },
    });
    await renderAt(window.location.href, <NetWorth />);

    const popped = nextPopState();
    await userEvent.click(
      within(await newSheet()).getByRole("button", { name: "Close" }),
    );
    await popped;

    expect(window.location.search).toBe(`?account=${ids.card}`);
  });

  it("opens the duplicate that a new Transaction finds on the Transactions screen", async () => {
    const { pushed } = await renderAt("/finance?new=expense", <NetWorth />);

    const sheet = await newSheet();
    await userEvent.keyboard("42.10");
    await userEvent.click(
      within(sheet).getByRole("combobox", { name: "Payee" }),
    );
    await userEvent.keyboard("tesco{Enter}");
    fireEvent.change(within(sheet).getByLabelText("Pick a date"), {
      target: { value: "2026-09-26" },
    });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Open existing" }),
    );

    expect(pushed).toEqual([`/finance/transactions?id=${ids.tescoShop}`]);
  });
});

describe("useTransactionTask on Transactions", () => {
  it("puts a refund in the open Transaction's place, so one close leaves both", async () => {
    window.history.replaceState(null, "", "/finance/transactions?q=tesco");
    const { task } = await renderTransactions(window.location.href);

    task().open(ids.tescoShop);
    const transaction = await screen.findByRole("region", {
      name: "Transaction",
    });
    await userEvent.click(refundAction(transaction));
    expect(window.location.search).toBe(
      `?q=tesco&new=expense&refund=${ids.tescoShop}`,
    );

    const popped = nextPopState();
    await userEvent.click(
      within(await newSheet()).getByRole("button", { name: "Close" }),
    );
    await popped;
    expect(window.location.search).toBe("?q=tesco");
  });

  it("replaces the open Transaction with a new expense after a save that asks for one", async () => {
    const { task } = await renderTransactions("/finance/transactions?q=tesco");

    task().open(ids.tescoShop);
    const transaction = await screen.findByRole("region", {
      name: "Transaction",
    });
    await userEvent.type(
      within(transaction).getByRole("textbox", { name: "Amount" }),
      "{Control>}{Enter}{/Control}",
    );

    expect(window.location.search).toBe("?q=tesco&new=expense");
    expect(
      within(await newSheet()).getByRole("textbox", { name: "Amount" }),
    ).toHaveValue("");
  });

  it("fills in the new Transaction with quick add's draft, and focuses the field it leaves empty", async () => {
    const { task } = await renderTransactions("/finance/transactions");

    task().openNew(
      editorDraft("expense", "2026-10-01", {
        amountText: "12.50",
        payeeName: "Tesco",
        payeeId: ids.tesco,
        accountId: ids.current,
      }),
    );

    const sheet = await newSheet();
    expect(
      await within(sheet).findByRole("textbox", { name: "Amount" }),
    ).toHaveValue("12.50");
    await waitFor(() => {
      expect(firstCategory(sheet)).toHaveFocus();
    });
  });

  it("opens a Transaction with focus on the field the keyboard asks for", async () => {
    const { task } = await renderTransactions("/finance/transactions");

    task().open(ids.tescoShop, "category");

    const transaction = await screen.findByRole("region", {
      name: "Transaction",
    });
    await waitFor(() => {
      expect(firstCategory(transaction)).toHaveFocus();
    });
  });

  it("opens the duplicate that a new Transaction finds in the detail column, with the list's filters", async () => {
    await renderTransactions("/finance/transactions?q=tesco&new=expense");

    const sheet = await newSheet();
    await userEvent.keyboard("42.10");
    await userEvent.click(
      within(sheet).getByRole("combobox", { name: "Payee" }),
    );
    await userEvent.keyboard("tesco{Enter}");
    fireEvent.change(within(sheet).getByLabelText("Pick a date"), {
      target: { value: "2026-09-26" },
    });
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Open existing" }),
    );

    expect(window.location.search).toBe(`?q=tesco&id=${ids.tescoShop}`);
    expect(
      await screen.findByRole("region", { name: "Transaction" }),
    ).toBeVisible();
  });
});

describe("NewTransactionTask", () => {
  it("stays closed without `?new=`", async () => {
    await renderAt("/finance/analytics", <NewTransactionTask />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes back to the screen as it was", async () => {
    await renderAt(
      "/finance/analytics?range=year&new=expense",
      <NewTransactionTask />,
    );

    await userEvent.click(
      within(await newSheet()).getByRole("button", { name: "Close" }),
    );

    expect(window.location.pathname).toBe("/finance/analytics");
    expect(window.location.search).toBe("?range=year");
  });
});
