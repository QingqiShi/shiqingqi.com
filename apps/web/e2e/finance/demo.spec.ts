import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../../src/finance/domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../../src/finance/domain/dates/today-in-time-zone.ts";
import { clickUntil, expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  dayListPath,
  openTransactions,
  rowsWith,
  transactionRows,
} from "./transactions-page.ts";

test.describe("Finance demo at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("a visitor opens the demo, edits it in the tab, and a reload drops the edit", async ({
    page,
    demo: _demo,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname.startsWith("/api/finance/") &&
        !url.pathname.startsWith("/api/finance/auth/") &&
        request.method() !== "GET"
      ) {
        writes.push(`${request.method()} ${url.pathname}`);
      }
    });

    await page.goto("/finance/sign-in");
    await clickUntil(page.getByRole("button", { name: "Try the demo" }), () =>
      page.waitForURL((url) => url.pathname === "/finance", { timeout: 5000 }),
    );
    await expect(
      page.getByRole("button", { name: "Demo · not saved" }),
    ).toBeVisible();

    await openTransactions(page);
    await expect(transactionRows(page).first()).toBeVisible();

    const today = dayListPath(todayInTimeZone(DEFAULT_HOUSEHOLD_TIME_ZONE));
    await openTransactions(page, today);
    const added = rowsWith(page, "Tesco", "43.21");
    await expect(added).toHaveCount(0);
    const quickAdd = page.getByRole("textbox", { name: "Quick add" });
    await quickAdd.fill("43.21 tesco");
    await quickAdd.press("Enter");
    await expect(added).toHaveCount(1);

    await page.reload();
    await openTransactions(page, today);
    await expect(added).toHaveCount(0);
    expect(writes).toEqual([]);
  });
});
