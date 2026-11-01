import type { Locator, Page, Route } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { entries, transactions } from "../src/finance/db/schema.ts";
import type { FinanceDb } from "../src/finance/db/types.ts";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  dayListPath,
  openTransactions,
  quickAddLine,
  rowsWith,
  SYNC_TIMEOUT,
  syncStatus,
} from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

/** The Replica writes server rows after the screen shows them; a reload before that downloads them again. */
function bootstrappedOnDisk(page: Page, householdId: string) {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(`finance-replica-${id}`);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(new Error("Failed to open the Replica"));
      };
    });
    const meta = await new Promise<unknown>((resolve) => {
      const request = db.transaction("meta").objectStore("meta").get("meta");
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
    db.close();
    return (
      typeof meta === "object" &&
      meta !== null &&
      "bootstrapped" in meta &&
      meta.bootstrapped === true
    );
  }, householdId);
}

/** The Entry amounts on the server of the live Transaction that `row` shows. */
async function storedAmounts(
  financeDb: FinanceDb,
  householdId: string,
  row: Locator,
) {
  const id = await row.getAttribute("data-transaction-id");
  return financeDb
    .select({ amountMinor: entries.amountMinor })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.id, id ?? ""),
        isNull(transactions.deletedAt),
        isNull(entries.deletedAt),
      ),
    );
}

test("a transaction added offline waits on the device, then syncs when the network is back", async ({
  page,
  household,
  session,
  financeDb,
}) => {
  await openTransactions(page, dayListPath(household.today));
  await expect(syncStatus(page, /^Synced/)).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  await page.context().setOffline(true);
  await expect(syncStatus(page, /^Offline/)).toBeVisible();
  const quickAdd = page.getByRole("textbox", { name: "Quick add" });
  await quickAdd.fill("7.77 tesco");
  await quickAdd.press("Enter");

  const row = rowsWith(page, "Tesco", "7.77");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Not synced yet");
  await expect(syncStatus(page, "Offline · 1")).toBeVisible();

  await page.context().setOffline(false);
  await expect(row).not.toContainText("Not synced yet", {
    timeout: SYNC_TIMEOUT,
  });
  await expect(syncStatus(page, /^Synced/)).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  expect(await storedAmounts(financeDb, session.householdId, row)).toEqual([
    { amountMinor: -777 },
  ]);

  await page.reload();
  await expect(row).toHaveCount(1);
  await expect(row).not.toContainText("Not synced yet");
});

test("a transaction added just before a reload stays on the device and syncs after it", async ({
  page,
  household,
  session,
  financeDb,
}) => {
  await openTransactions(page, dayListPath(household.today));
  await expect(syncStatus(page, /^Synced/)).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  await expect
    .poll(() => bootstrappedOnDisk(page, session.householdId))
    .toBe(true);

  const blockPush = (route: Route) =>
    route.request().method() === "POST" ? route.abort() : route.fallback();
  await page.context().route("**/api/sync**", blockPush);
  await quickAddLine(page, "6.43 tesco");
  await page.reload();

  const row = rowsWith(page, "Tesco", "6.43");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Not synced yet");

  await page.context().unroute("**/api/sync**", blockPush);
  await expect(row).not.toContainText("Not synced yet", {
    timeout: SYNC_TIMEOUT,
  });
  expect(await storedAmounts(financeDb, session.householdId, row)).toEqual([
    { amountMinor: -643 },
  ]);
});
