import { and, eq } from "drizzle-orm";
import { transactions } from "../../src/finance/db/schema.ts";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  MOBILE,
  openTransactions,
  SYNC_TIMEOUT,
  syncStatus,
  toast,
} from "./transactions-page.ts";

for (const viewport of [DESKTOP, MOBILE]) {
  test.describe(`Review at ${String(viewport.width)} px`, () => {
    test.use({ viewport });

    test("“Looks right” takes a bank row out of Review and syncs it", async ({
      page,
      session,
      financeDb,
    }) => {
      await openTransactions(page, "/finance/transactions?review=1");
      const reviewChip = page.getByRole("button", { name: /^Review \(\d+\)$/ });
      await expect(reviewChip).toHaveAttribute("aria-pressed", "true");
      const label = (await reviewChip.textContent()) ?? "";
      const waiting = Number(/\((\d+)\)/.exec(label)?.[1]);
      expect(waiting).toBeGreaterThan(0);

      const looksRight = page.getByRole("button", { name: "Looks right" });
      await expect(looksRight.first()).toBeVisible();
      const shown = await looksRight.count();
      const row = page
        .locator("[data-transaction-row]", { has: looksRight })
        .first();
      const id = (await row.getAttribute("data-transaction-row")) ?? "";

      await row.getByRole("button", { name: "Looks right" }).click();
      await expect(toast(page, "Marked as reviewed")).toBeVisible();
      await expect(page.locator(`[data-transaction-row="${id}"]`)).toHaveCount(
        0,
      );
      await expect(looksRight).toHaveCount(shown - 1);
      await expect(
        page.getByRole("button", { name: `Review (${String(waiting - 1)})` }),
      ).toBeVisible();

      if (viewport.width < 768) {
        await page.getByRole("link", { name: "Settings" }).click();
      }
      await expect(syncStatus(page, /^Synced/)).toBeVisible({
        timeout: SYNC_TIMEOUT,
      });
      await expect
        .poll(
          async () =>
            financeDb
              .select({ needsReview: transactions.needsReview })
              .from(transactions)
              .where(
                and(
                  eq(transactions.householdId, session.householdId),
                  eq(transactions.id, id),
                ),
              ),
          { timeout: SYNC_TIMEOUT },
        )
        .toEqual([{ needsReview: false }]);
    });
  });
}
