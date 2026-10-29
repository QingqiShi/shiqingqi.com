import { and, desc, eq, isNull } from "drizzle-orm";
import { accounts, valuations } from "../src/finance/db/schema.ts";
import type { FinanceDb } from "../src/finance/db/types.ts";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT, toast } from "./transactions-page.ts";

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

    await page.goto("/");
    await page.getByRole("link", { name: "Update balances" }).click();

    const home = page.getByRole("textbox", { name: "Family Home" });
    await home.fill("9,999,999");
    await page.getByRole("button", { name: /^Save all/ }).click();
    await page.getByRole("button", { name: "Save anyway" }).click();

    await expect(page).toHaveURL("/");
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
