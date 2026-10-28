import { and, eq } from "drizzle-orm";
import { transactions } from "../../src/finance/db/schema.ts";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  openTransactions,
  SYNC_TIMEOUT,
  syncStatus,
} from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

test("“Looks right” takes a bank row out of Review, makes it the Member's, and syncs it", async ({
  page,
  session,
  financeDb,
}) => {
  await openTransactions(page, "/finance/transactions?review=1");
  const looksRight = page.getByRole("button", { name: "Looks right" });
  await expect(looksRight.first()).toBeVisible();
  const row = page
    .locator("[data-transaction-row]", { has: looksRight })
    .first();
  const id = (await row.getAttribute("data-transaction-row")) ?? "";

  await row.getByRole("button", { name: "Looks right" }).click();
  await expect(page.locator(`[data-transaction-row="${id}"]`)).toHaveCount(0);

  await expect(syncStatus(page, /^Synced/)).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });
  await expect
    .poll(
      async () =>
        financeDb
          .select({
            needsReview: transactions.needsReview,
            labelledBy: transactions.labelledBy,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.householdId, session.householdId),
              eq(transactions.id, id),
            ),
          ),
      { timeout: SYNC_TIMEOUT },
    )
    .toEqual([{ needsReview: false, labelledBy: "member" }]);
});
