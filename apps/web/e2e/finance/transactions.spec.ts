import { and, eq } from "drizzle-orm";
import { accounts } from "../../src/finance/db/schema.ts";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  MOBILE,
  dayListPath,
  openNewExpense,
  openTransactions,
  optionValue,
  rowsWith,
  SYNC_TIMEOUT,
  toast,
  transactionRows,
} from "./transactions-page.ts";

for (const viewport of [DESKTOP, MOBILE]) {
  test.describe(`Transactions at ${String(viewport.width)} px`, () => {
    test.use({ viewport });

    test("quick add saves “12.5 tesco” with Tesco’s category in three interactions", async ({
      page,
      household,
      session: _session,
    }) => {
      await openTransactions(page, dayListPath(household.today));
      const quickAdd = page.getByRole("textbox", { name: "Quick add" });
      const added = rowsWith(page, "Tesco", "12.50");
      const before = await added.count();

      await quickAdd.click();
      await quickAdd.fill("12.5 tesco");
      await expect(
        page.getByText(/^Expense · £12\.50 · Tesco · 超市 · .+ · Enter saves$/),
      ).toBeVisible();
      await quickAdd.press("Enter");

      await expect(toast(page, "Added · £12.50 · Tesco")).toBeVisible();
      await expect(added).toHaveCount(before + 1);
      await expect(added.first()).toContainText("超市");
      await expect(quickAdd).toHaveValue("");
    });

    test("the full editor saves an expense with the payee’s last details filled in", async ({
      page,
      household,
      session: _session,
    }) => {
      const editor = await openNewExpense(page);
      await editor.getByRole("textbox", { name: "Amount" }).fill("8.40");
      const payee = editor.getByRole("combobox", { name: "Payee" });
      await payee.pressSequentially("Tes");
      await page.getByRole("option", { name: /^Tesco/ }).click();

      await expect(payee).toHaveValue("Tesco");
      await expect(
        editor.getByRole("button", { name: /超市/, pressed: true }),
      ).toBeVisible();
      await expect(editor.getByText("From last time").first()).toBeVisible();
      await expect(
        editor.getByRole("combobox", { name: "Account" }),
      ).not.toHaveValue("");

      // The Outbox write to IndexedDB is async. A page load before the push
      // can lose the new transaction, so wait for the push first.
      const pushed = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/finance/sync") &&
          response.request().method() === "POST" &&
          response.ok(),
      );
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      await expect(toast(page, "Added")).toBeVisible();
      await expect(editor).toBeHidden();
      await pushed;

      await openTransactions(page, dayListPath(household.today));
      await expect(rowsWith(page, "Tesco", "8.40", "超市")).toHaveCount(1);
    });
  });
}

test.describe("Transactions at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("a transfer moves money between two accounts", async ({
    page,
    household,
    session: _session,
  }) => {
    await openTransactions(
      page,
      dayListPath(household.today, { kind: "transfer" }),
    );
    await (
      await openNewExpense(page)
    )
      .getByRole("radio", { name: "Transfer" })
      .click();
    const editor = page.getByRole("form", { name: "New transfer" });
    await expect(editor).toBeVisible();
    await editor.getByRole("textbox", { name: "Amount sent" }).fill("250");
    const from = editor.getByRole("combobox", { name: "From" });
    const to = editor.getByRole("combobox", { name: "To" });
    await from.selectOption(await optionValue(from, "Alex Current"));
    await to.selectOption(await optionValue(to, "Rainy Day Savings"));
    await editor.getByRole("button", { name: "Save", exact: true }).click();

    await expect(toast(page, "Added")).toBeVisible();
    await expect(
      rowsWith(
        page,
        "Transfer",
        "£250.00",
        /Alex Current.*→.*Rainy Day Savings/,
      ),
    ).toHaveCount(1);
  });

  test("an edit saves, and a delete can be undone", async ({
    page,
    household,
    session: _session,
  }) => {
    await openTransactions(page, dayListPath(household.today));
    const quickAdd = page.getByRole("textbox", { name: "Quick add" });
    await quickAdd.fill("3.21 tesco");
    await quickAdd.press("Enter");
    const original = rowsWith(page, "Tesco", "3.21");
    await expect(original).toHaveCount(1);

    await original.click();
    const editor = page.getByRole("form", { name: "Transaction" });
    const amount = editor.getByRole("textbox", { name: "Amount" });
    await expect(amount).toHaveValue("3.21");
    await amount.fill("4.32");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toast(page, "Saved")).toBeVisible();
    const edited = rowsWith(page, "Tesco", "4.32");
    await expect(edited).toHaveCount(1);
    await expect(original).toHaveCount(0);

    await edited.click();
    await editor.getByRole("button", { name: "Delete" }).click();
    const deleted = toast(page, "Deleted");
    await expect(deleted).toBeVisible();
    await expect(edited).toHaveCount(0);
    await deleted.getByRole("button", { name: "Undo" }).click();
    await expect(edited).toHaveCount(1);
  });

  test("Expected rows after today fold under Coming up, and Paid today can be undone", async ({
    page,
    session: _session,
  }) => {
    await openTransactions(page);
    const comingUp = page.getByRole("button", { name: /^Coming up \(\d+\)/ });
    await expect(comingUp).toHaveAttribute("aria-expanded", "false");
    const paidToday = page.getByRole("button", { name: "Paid today" });
    await expect(paidToday).toHaveCount(0);

    await comingUp.click();
    await expect(comingUp).toHaveAttribute("aria-expanded", "true");
    await expect(paidToday.first()).toBeVisible();
    const before = await paidToday.count();
    await paidToday.first().click();
    const confirmed = toast(page, "Confirmed as paid today");
    await expect(confirmed).toBeVisible();
    await expect(paidToday).toHaveCount(before - 1);
    await confirmed.getByRole("button", { name: "Undo" }).click();
    await expect(paidToday).toHaveCount(before);
  });

  test("a purchase can be paid in instalments", async ({
    page,
    household,
    session,
    financeDb,
  }) => {
    await openTransactions(page, dayListPath(household.today));
    const quickAdd = page.getByRole("textbox", { name: "Quick add" });
    await quickAdd.fill("600 tesco");
    await quickAdd.press("Enter");
    const purchase = rowsWith(page, "Tesco", "600.00");
    await expect(purchase).toHaveCount(1);
    await purchase.click();

    const editor = page.getByRole("form", { name: "Transaction" });
    await editor.getByRole("button", { name: "Pay in instalments" }).click();
    const months = editor.getByRole("textbox", { name: "Months" });
    await months.fill("6");
    await expect(
      editor.getByText(/^6 monthly payments of £100\.00 · total £600\.00/),
    ).toBeVisible();
    await editor.getByRole("button", { name: "Add plan" }).click();
    await expect(toast(page, /^Instalment plan added/)).toBeVisible();
    await expect(rowsWith(page, "Tesco", "100.00")).toHaveCount(1);

    await expect
      .poll(
        async () =>
          financeDb
            .select({
              kind: accounts.kind,
              excluded: accounts.excludedFromNetWorth,
            })
            .from(accounts)
            .where(
              and(
                eq(accounts.householdId, session.householdId),
                eq(accounts.name, "Instalments · Tesco"),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toEqual([{ kind: "loan", excluded: true }]);
  });

  test("filters come from the URL and go back into it", async ({
    page,
    session: _session,
  }) => {
    const rows = transactionRows(page);
    const kind = page.getByRole("combobox", { name: "Kind" });
    const search = page.getByRole("searchbox", { name: "Search transactions" });

    await openTransactions(page, "/finance/transactions?kind=income");
    await expect(kind).toHaveValue("income");
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) await expect(row).toContainText("+£");

    await openTransactions(page, "/finance/transactions?q=tesco");
    await expect(search).toHaveValue("tesco");
    await expect(rows.first()).toBeVisible();
    for (const row of await rows.all()) {
      await expect(row).toContainText("Tesco");
    }

    await kind.selectOption("transfer");
    await expect(page).toHaveURL(/[?&]kind=transfer(&|$)/);
    await expect(page).toHaveURL(/[?&]q=tesco(&|$)/);
    await expect(
      page.getByText("Nothing matches these filters."),
    ).toBeVisible();

    await page.reload();
    await expect(kind).toHaveValue("transfer");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL("/finance/transactions?q=tesco");
    await expect(kind).toHaveValue("");
    await expect(rows.first()).toBeVisible();
    await search.press("Escape");
    await expect(page).toHaveURL("/finance/transactions");
  });

  test("the keyboard adds, moves through, opens and closes transactions", async ({
    page,
    household,
    session: _session,
  }) => {
    await openTransactions(page, dayListPath(household.today));
    const quickAdd = page.getByRole("textbox", { name: "Quick add" });
    await quickAdd.fill("2.10 tesco");
    await quickAdd.press("Enter");
    await expect(rowsWith(page, "Tesco", "2.10")).toHaveCount(1);
    await quickAdd.blur();
    await expect(
      page.getByText("Pick a transaction to see or change it."),
    ).toBeVisible();
    await page.keyboard.press("n");
    const editor = page.getByRole("form", { name: "New expense" });
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("textbox", { name: "Amount" })).toBeFocused();
    await page.keyboard.type("6.5");
    await editor.getByRole("combobox", { name: "Payee" }).focus();
    await page.keyboard.type("Tesco");
    await page.keyboard.press("Enter");
    await expect(
      editor.getByRole("button", { name: /超市/, pressed: true }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(toast(page, "Added")).toBeVisible();
    await expect(editor).toBeHidden();
    await expect(rowsWith(page, "Tesco", "6.50")).toHaveCount(1);

    const rows = transactionRows(page);
    await page.keyboard.press("j");
    await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press("j");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("k");
    await expect(rows.nth(0)).toBeFocused();

    const firstId = await rows.nth(0).getAttribute("data-transaction-id");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]id=${firstId ?? ""}`));
    await expect(
      page
        .getByRole("complementary", { name: "Transaction" })
        .getByRole("form"),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/[?&]id=/);
    await expect(
      page.getByText("Pick a transaction to see or change it."),
    ).toBeVisible();
    await expect(rows.nth(0)).toBeFocused();
  });
});

test.describe("Transactions at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("the filters fold behind one Filter button that counts the active ones", async ({
    page,
    session: _session,
  }) => {
    await openTransactions(page, "/finance/transactions?kind=income");
    const kind = page.getByRole("combobox", { name: "Kind" });
    const filter = page.getByRole("button", { name: /^Filter/ });
    await expect(kind).toBeHidden();
    await expect(filter).toHaveText(/1/);
    await filter.click();
    await expect(filter).toHaveAttribute("aria-expanded", "true");
    await expect(kind).toHaveValue("income");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});

test.describe("Transactions in Chinese", () => {
  test.use({ viewport: DESKTOP });

  test("quick add and the editor speak Chinese", async ({
    page,
    household,
    session: _session,
  }) => {
    await openTransactions(page, dayListPath(household.today, {}, "zh"));
    await expect(
      page.getByRole("heading", { level: 1, name: "交易" }),
    ).toBeVisible();
    const quickAdd = page.getByRole("textbox", { name: "快速记账" });
    await quickAdd.fill("12.5 tesco");
    await expect(
      page.getByText(/^支出 · £12\.50 · Tesco · 超市 · .+ · 按 Enter 保存$/),
    ).toBeVisible();
    await quickAdd.press("Enter");
    await expect(toast(page, "已记录 · £12.50 · Tesco")).toBeVisible();
    await expect(rowsWith(page, "Tesco", "12.50", "超市")).toHaveCount(1);

    await page.getByRole("button", { name: "记一笔", exact: true }).click();
    await expect(page.getByRole("form", { name: "记一笔支出" })).toBeVisible();
    await expect(page).toHaveURL(/\/zh\/finance\/transactions\?.*new=expense/);
  });
});
