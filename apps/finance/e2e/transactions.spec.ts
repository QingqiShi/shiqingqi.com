import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  dayListPath,
  openNewExpense,
  openTransactions,
  optionValue,
  rowsWith,
  toast,
} from "./transactions-page.ts";

test.describe("Transactions at 1440 px", () => {
  test.use({ viewport: DESKTOP });

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
    await quickAdd.press("Enter");

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
    await expect(
      editor.getByRole("combobox", { name: "Account" }),
    ).not.toHaveValue("");

    // The Outbox write to IndexedDB is async. A page load before the push
    // can lose the new transaction, so wait for the push first.
    const pushed = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/sync") &&
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
});

test.describe("Transactions in Chinese", () => {
  test.use({ viewport: DESKTOP });

  test("search keeps pinyin as it composes", async ({
    page,
    household,
    session: _session,
  }) => {
    await openTransactions(page, dayListPath(household.today, {}, "zh"));
    const search = page.getByRole("searchbox", { name: "搜索交易" });
    await search.click();

    const cdp = await page.context().newCDPSession(page);
    for (const text of ["h", "hu", "hua", "hua f", "hua fe", "hua fei"]) {
      await cdp.send("Input.imeSetComposition", {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
      await expect(search).toHaveValue(text);
    }
    await cdp.send("Input.insertText", { text: "话费" });

    await expect(search).toHaveValue("话费");
    await expect(page).toHaveURL(/[?&]q=%E8%AF%9D%E8%B4%B9(&|$)/);
  });
});
