import { and, desc, eq, isNull } from "drizzle-orm";
import {
  accounts,
  bankLinks,
  bankTransactions,
  connections,
  entries,
  households,
  transactions,
  valuations,
} from "../../src/finance/db/schema.ts";
import type { FinanceDb } from "../../src/finance/db/types.ts";
import { addDays } from "../../src/finance/domain/dates/add-days.ts";
import { todayInTimeZone } from "../../src/finance/domain/dates/today-in-time-zone.ts";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, MOBILE, SYNC_TIMEOUT, toast } from "./transactions-page.ts";

async function accountId(db: FinanceDb, householdId: string, name: string) {
  const row = (
    await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(eq(accounts.householdId, householdId), eq(accounts.name, name)),
      )
  ).at(0);
  if (!row) throw new Error(`No account named ${name}`);
  return row.id;
}

/**
 * The latest day up to today with no live Entry on the account. The balance
 * check lists the Entries on the bank's balance day, so on a day with none of
 * the seeded Entries, only the Entries a test adds can be listed.
 */
async function quietDay(db: FinanceDb, householdId: string, id: string) {
  const busy = new Set(
    (
      await db
        .select({ on: entries.date })
        .from(entries)
        .where(
          and(
            eq(entries.householdId, householdId),
            eq(entries.accountId, id),
            isNull(entries.deletedAt),
          ),
        )
    ).map(({ on }) => on),
  );
  let day = todayInTimeZone("Europe/London");
  while (busy.has(day)) day = addDays(day, -1);
  return day;
}

/** The live Valuations of an account, newest day first. */
function liveValuations(db: FinanceDb, householdId: string, id: string) {
  return db
    .select({
      on: valuations.on,
      amountMinor: valuations.amountMinor,
      source: valuations.source,
    })
    .from(valuations)
    .where(
      and(
        eq(valuations.householdId, householdId),
        eq(valuations.accountId, id),
        isNull(valuations.deletedAt),
      ),
    )
    .orderBy(desc(valuations.on));
}

test.describe("Update balances at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("a large change asks again, saves a Valuation, and Undo takes it back", async ({
    page,
    session,
    financeDb,
  }) => {
    const homeId = await accountId(
      financeDb,
      session.householdId,
      "Family Home",
    );
    const before = await liveValuations(financeDb, session.householdId, homeId);

    await page.goto("/finance");
    await page.getByRole("link", { name: "Update balances" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Update balances" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox").first()).toBeFocused();

    const home = page.getByRole("textbox", { name: "Family Home" });
    await home.fill("9,999,999");
    await expect(page.getByText(/check this/)).toBeVisible();
    await page.getByRole("button", { name: /^Save all/ }).click();
    await expect(page.getByText("Some balances changed a lot")).toBeVisible();
    await page.getByRole("button", { name: "Save anyway" }).click();

    await expect(page).toHaveURL(/\/finance$/);
    await expect(toast(page, "1 balance updated")).toBeVisible();
    await expect
      .poll(
        async () =>
          (await liveValuations(financeDb, session.householdId, homeId)).at(0)
            ?.amountMinor,
        { timeout: SYNC_TIMEOUT },
      )
      .toBe(999_999_900);

    await toast(page, "1 balance updated")
      .getByRole("button", { name: "Undo" })
      .click();
    await expect
      .poll(
        async () => liveValuations(financeDb, session.householdId, homeId),
        { timeout: SYNC_TIMEOUT },
      )
      .toEqual(before);
  });
});

test.describe("Bank balance at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("a bank balance that differs shows a line on Net worth, “Bank says … · we say …” on the account, and keeps an Entry the bank left out", async ({
    page,
    session,
    financeDb,
  }) => {
    const currentId = await accountId(
      financeDb,
      session.householdId,
      "Alex Current",
    );
    const balanceDay = await quietDay(
      financeDb,
      session.householdId,
      currentId,
    );
    await financeDb.transaction(async (tx) => {
      const household = (
        await tx
          .select({ clock: households.clock })
          .from(households)
          .where(eq(households.id, session.householdId))
          .for("update")
      ).at(0);
      if (!household) throw new Error("No household");
      const version = household.clock + 1;
      const connectionId = crypto.randomUUID();
      await tx.insert(connections).values({
        id: connectionId,
        householdId: session.householdId,
        label: "Lunch Flow",
        version,
      });
      const linkId = crypto.randomUUID();
      await tx.insert(bankLinks).values({
        id: linkId,
        householdId: session.householdId,
        connectionId,
        accountId: currentId,
        providerAccountId: `e2e-${currentId}`,
        providerName: "Current account",
        currency: "GBP",
        bankBalanceMinor: 123_456,
        bankBalanceOn: balanceDay,
        balanceDifferenceMinor: 1,
        version,
      });
      await tx.insert(bankTransactions).values({
        id: crypto.randomUUID(),
        householdId: session.householdId,
        linkId,
        providerTxId: "e2e-history",
        date: balanceDay,
        amountMinor: -100,
        currency: "GBP",
        raw: {},
        state: "ignored",
        version,
      });
      const transactionId = crypto.randomUUID();
      await tx.insert(transactions).values({
        id: transactionId,
        householdId: session.householdId,
        kind: "expense",
        date: balanceDay,
        note: "Left out by the bank",
        version,
      });
      await tx.insert(entries).values({
        id: crypto.randomUUID(),
        householdId: session.householdId,
        transactionId,
        accountId: currentId,
        date: balanceDay,
        amountMinor: -8495,
        version,
      });
      await tx
        .update(households)
        .set({ clock: version })
        .where(eq(households.id, session.householdId));
    });

    await page.goto("/finance");
    const summary = page.getByRole("link", {
      name: /^Alex Current · £[\d,.]+ off the bank/,
    });
    await expect(summary).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect(page.getByText(/Bank says/)).toHaveCount(0);

    await summary.click();
    await expect(page).toHaveURL(new RegExp(`/finance\\?account=${currentId}`));
    const notice = page.getByText(/Bank says £1,234\.56 · we say/).first();
    await expect(notice).toBeVisible({ timeout: SYNC_TIMEOUT });
    const keep = page.getByRole("button", { name: /^Keep .*[-−]£84\.95$/ });
    await expect(keep).toBeVisible({ timeout: SYNC_TIMEOUT });

    await keep.click();
    await expect(keep).toHaveCount(0);
    await expect(
      page
        .getByText(
          "The bank's transactions don't explain the difference: it is older than them, or the bank left a transaction out.",
          { exact: true },
        )
        .first(),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });

    await toast(page, "Kept").getByRole("button", { name: "Undo" }).click();
    await expect(keep).toBeVisible({ timeout: SYNC_TIMEOUT });
  });
});
