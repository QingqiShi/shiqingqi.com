import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent, waitFor } from "#src/testing/test-utils.tsx";
import { financeNavigator } from "../navigation/finance-navigator.ts";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { FinanceAddButton } from "./finance-add-button.tsx";
import { NewTransactionSheet } from "./new-transaction-sheet.tsx";

const ids = TEST_IDS;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  window.history.replaceState(null, "", "/finance");
});

async function openSheet(search: string, accountId?: string) {
  const runtime = await createTestReplica();
  const view = renderWithReplica(
    runtime,
    <NewTransactionSheet accountId={accountId} />,
    { pathname: "/finance", search },
  );
  return { runtime, ...view };
}

describe("FinanceAddButton", () => {
  it("links to a new expense over the screen it is on", async () => {
    const runtime = await createTestReplica();
    renderWithReplica(runtime, <FinanceAddButton />, {
      pathname: "/finance",
      search: `account=${ids.card}`,
    });
    expect(screen.getByRole("link", { name: "Add" })).toHaveAttribute(
      "href",
      `/finance?account=${ids.card}&new=expense`,
    );
  });
});

describe("NewTransactionSheet", () => {
  it("starts a new expense on the account of the page, and a save leaves the page as it was", async () => {
    window.history.replaceState(
      null,
      "",
      `/finance?account=${ids.current}&new=expense`,
    );
    const { runtime } = await openSheet(
      `account=${ids.current}&new=expense`,
      ids.current,
    );

    expect(
      screen.getByRole("dialog", { name: "New transaction" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("combobox", { name: "Account" }),
    ).toHaveValue(ids.current);
    await userEvent.keyboard("4.20");
    await userEvent.click(screen.getByRole("button", { name: /Groceries/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(runtime.store.takeOutbox().at(-1)).toMatchObject({
      name: "createTransaction",
      args: { entries: [{ accountId: ids.current, amountMinor: -420 }] },
    });
    expect(window.location.pathname).toBe("/finance");
    expect(window.location.search).toBe(`?account=${ids.current}`);
  });

  it("goes back when the Add action opened it", async () => {
    const navigator = financeNavigator(
      { push: () => undefined, replace: () => undefined },
      "en",
    );
    navigator.open({
      screen: "netWorth",
      account: ids.card,
      newTransaction: { kind: "expense" },
    });
    await openSheet(`account=${ids.card}&new=expense`, ids.card);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
    expect(window.location.pathname).toBe("/finance");
  });

  it("stays closed without `?new=`", async () => {
    await openSheet(`account=${ids.card}`, ids.card);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
