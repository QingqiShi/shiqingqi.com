import { and, desc, eq, isNull } from "drizzle-orm";
import {
  accounts,
  bankLinks,
  connections,
  households,
  valuations,
} from "../../src/finance/db/schema.ts";
import type { FinanceDb } from "../../src/finance/db/types.ts";
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

  test("a bank balance that differs shows “Bank says … · we say …”, and “Use bank balance” sets it", async ({
    page,
    session,
    financeDb,
  }) => {
    const currentId = await accountId(
      financeDb,
      session.householdId,
      "Alex Current",
    );
    const today = todayInTimeZone("Europe/London");
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
      await tx.insert(bankLinks).values({
        id: crypto.randomUUID(),
        householdId: session.householdId,
        connectionId,
        accountId: currentId,
        providerAccountId: `e2e-${currentId}`,
        providerName: "Current account",
        currency: "GBP",
        bankBalanceMinor: 123_456,
        bankBalanceOn: today,
        balanceDifferenceMinor: 1,
        version,
      });
      await tx
        .update(households)
        .set({ clock: version })
        .where(eq(households.id, session.householdId));
    });

    await page.goto("/finance");
    const notice = page.getByText(/Bank says £1,234\.56 · we say/).first();
    await expect(notice).toBeVisible({ timeout: SYNC_TIMEOUT });
    await page
      .getByRole("button", { name: "Use bank balance" })
      .first()
      .click();
    await expect(notice).toBeHidden({ timeout: SYNC_TIMEOUT });
    await expect
      .poll(
        async () =>
          (await liveValuations(financeDb, session.householdId, currentId)).at(
            0,
          ),
        { timeout: SYNC_TIMEOUT },
      )
      .toMatchObject({ amountMinor: 123_456, source: "bank" });
  });
});
