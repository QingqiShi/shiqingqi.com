import type { Page, Route } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { transactions } from "../../src/finance/db/schema.ts";
import { expect, test } from "./finance-test.ts";
import {
  DESKTOP,
  dayListPath,
  openTransactions,
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

  const id = await row.getAttribute("data-transaction-id");
  const stored = await financeDb
    .select({ amountMinor: transactions.amountMinor })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, session.householdId),
        eq(transactions.id, id ?? ""),
        isNull(transactions.deletedAt),
      ),
    );
  expect(stored).toEqual([{ amountMinor: -777 }]);

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
  await page.context().route("**/api/finance/sync**", blockPush);
  const quickAdd = page.getByRole("textbox", { name: "Quick add" });
  await quickAdd.fill("6.43 tesco");
  await quickAdd.press("Enter");
  await page.reload();

  const row = rowsWith(page, "Tesco", "6.43");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Not synced yet");

  await page.context().unroute("**/api/finance/sync**", blockPush);
  await expect(row).not.toContainText("Not synced yet", {
    timeout: SYNC_TIMEOUT,
  });
  const id = await row.getAttribute("data-transaction-id");
  const stored = await financeDb
    .select({ amountMinor: transactions.amountMinor })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, session.householdId),
        eq(transactions.id, id ?? ""),
      ),
    );
  expect(stored).toEqual([{ amountMinor: -643 }]);
});

test("a change the server does not take stays on the device, and new data still arrives", async ({
  page,
  household,
  session,
  financeDb,
}) => {
  await openTransactions(page, dayListPath(household.today));
  await expect(syncStatus(page, /^Synced/)).toBeVisible({
    timeout: SYNC_TIMEOUT,
  });

  const refusePush = (route: Route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, body: "" })
      : route.fallback();
  await page.context().route("**/api/finance/sync**", refusePush);
  const refused = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/finance/sync") &&
      response.status() === 500,
  );
  const quickAdd = page.getByRole("textbox", { name: "Quick add" });
  await quickAdd.fill("5.55 tesco");
  await quickAdd.press("Enter");
  await refused;
  const pulled = await page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/api\/finance\/sync\?since=[1-9]/.test(response.url()) &&
      response.status() === 200,
    { timeout: SYNC_TIMEOUT },
  );
  expect(pulled.ok()).toBe(true);

  const row = rowsWith(page, "Tesco", "5.55");
  await expect(row).toContainText("Not synced yet");
  await expect(syncStatus(page, /^Changes not sent/)).toBeVisible();

  await page.context().unroute("**/api/finance/sync**", refusePush);
  await expect(row).not.toContainText("Not synced yet", {
    timeout: SYNC_TIMEOUT,
  });
  const id = await row.getAttribute("data-transaction-id");
  const stored = await financeDb
    .select({ amountMinor: transactions.amountMinor })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, session.householdId),
        eq(transactions.id, id ?? ""),
      ),
    );
  expect(stored).toEqual([{ amountMinor: -555 }]);
});
