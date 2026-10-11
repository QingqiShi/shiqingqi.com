import type { Page } from "@playwright/test";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  bankLinks,
  categories,
  fxRates,
  members,
  payeeAliases,
  rules,
  tags,
} from "../../src/finance/db/schema.ts";
import {
  addVirtualAuthenticator,
  expect,
  getFinanceApi,
  test,
} from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT, toast } from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

/** Opens a Settings section and waits until the Replica has the Household. */
async function openSettings(page: Page, section: string, heading: string) {
  await page.goto(`/finance/settings/${section}`);
  await expect(
    page.getByRole("heading", { level: 2, name: heading }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

test.describe("Settings", () => {
  test("a category and a tag can be added and renamed, and the change syncs", async ({
    page,
    session,
    financeDb,
  }) => {
    await openSettings(page, "categories", "Categories");
    await page.getByRole("button", { name: "Category", exact: true }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Allotment");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: /Allotment/ }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Garden");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Category saved")).toBeVisible();
    await expect(page.getByRole("button", { name: /Garden/ })).toBeVisible();
    await expect
      .poll(
        async () =>
          financeDb
            .select({ name: categories.name })
            .from(categories)
            .where(
              and(
                eq(categories.householdId, session.householdId),
                eq(categories.name, "Garden"),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toHaveLength(1);

    await openSettings(page, "tags", "Tags");
    await page.getByRole("button", { name: "Tag", exact: true }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Birthday");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: /Birthday/ })).toBeVisible();

    await expect
      .poll(
        async () =>
          financeDb
            .select({ name: tags.name })
            .from(tags)
            .where(
              and(
                eq(tags.householdId, session.householdId),
                eq(tags.name, "Birthday"),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toHaveLength(1);
  });

  test("an owner adds a member and invites them; the member accepts with a passkey on another device", async ({
    page,
    session,
    financeDb,
    browser,
  }) => {
    await openSettings(page, "members", "Members");
    await page.getByRole("button", { name: "Member", exact: true }).click();
    await page.getByRole("textbox", { name: /Name/ }).fill("Jo");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Member added")).toBeVisible();
    await page.getByRole("button", { name: "Create invite link: Jo" }).click();
    const link = page.getByRole("textbox", { name: "Link" });
    await expect(link).toHaveValue(/\/finance\/invite\//, {
      timeout: SYNC_TIMEOUT,
    });
    const url = await link.inputValue();

    const other = await browser.newContext({ viewport: DESKTOP });
    const otherPage = await other.newPage();
    await addVirtualAuthenticator(otherPage);
    await otherPage.goto(url);
    await otherPage.getByRole("button", { name: "Create a passkey" }).click();
    await otherPage.waitForURL((next) => next.pathname === "/finance");
    await other.close();

    await expect
      .poll(
        async () =>
          financeDb
            .select({ name: members.name, role: members.role })
            .from(members)
            .where(
              and(
                eq(members.householdId, session.householdId),
                eq(members.name, "Jo"),
                isNotNull(members.userId),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toEqual([{ name: "Jo", role: "member" }]);
  });

  test("an owner removes a member: their device is signed out, and Undo brings the member back without access", async ({
    page,
    session,
    financeDb,
    browser,
  }) => {
    await openSettings(page, "members", "Members");
    await page.getByRole("button", { name: "Member", exact: true }).click();
    await page.getByRole("textbox", { name: /Name/ }).fill("Jo");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Create invite link: Jo" }).click();
    const link = page.getByRole("textbox", { name: "Link" });
    await expect(link).toHaveValue(/\/finance\/invite\//, {
      timeout: SYNC_TIMEOUT,
    });
    const other = await browser.newContext({ viewport: DESKTOP });
    const otherPage = await other.newPage();
    await addVirtualAuthenticator(otherPage);
    await otherPage.goto(await link.inputValue());
    await otherPage.getByRole("button", { name: "Create a passkey" }).click();
    await otherPage.waitForURL((next) => next.pathname === "/finance");
    const joSession = () =>
      getFinanceApi(otherPage, "/api/finance/auth/session").then((response) =>
        response.status(),
      );
    expect(await joSession()).toBe(200);

    await page.getByRole("button", { name: /^Jo/ }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Remove Jo?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove member" }).click();

    await expect(toast(page, "Member removed")).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    await expect(page.getByRole("button", { name: /^Jo/ })).toHaveCount(0);
    expect(await joSession()).toBe(401);
    const jo = () =>
      financeDb
        .select({ userId: members.userId, deletedAt: members.deletedAt })
        .from(members)
        .where(
          and(
            eq(members.householdId, session.householdId),
            eq(members.name, "Jo"),
          ),
        );
    expect(await jo()).toEqual([{ userId: null, deletedAt: expect.any(Date) }]);

    await toast(page, "Member removed")
      .getByRole("button", { name: "Undo" })
      .click();
    await expect(toast(page, /Member restored/)).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    await expect(
      page.getByRole("button", { name: /^Jo.*Not signed in yet/ }),
    ).toBeVisible();
    expect(await jo()).toEqual([{ userId: null, deletedAt: null }]);
    expect(await joSession()).toBe(401);
    await other.close();
  });

  test("rules list their next occurrence; a new rule syncs and pausing one marks it paused", async ({
    page,
    session,
    financeDb,
  }) => {
    await openSettings(page, "rules", "Recurring rules");
    await expect(
      page.getByRole("button", { name: /next \d{1,2} [A-Z][a-z]{2}/ }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "New rule" }).click();
    await page
      .getByRole("combobox", { name: "Payee" })
      .fill("Allotment society");
    await page.getByRole("option", { name: /New payee/ }).click();
    await page.getByRole("textbox", { name: "Amount" }).fill("15");
    await page
      .getByRole("combobox", { name: "Account" })
      .selectOption({ label: "Alex Current" });
    const category = page.getByRole("combobox", { name: "Category" });
    const firstCategory = await category
      .locator("option:not([disabled])")
      .first()
      .getAttribute("value");
    await category.selectOption(firstCategory ?? "");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Rule added")).toBeVisible();

    await page
      .getByRole("button", { name: "Pause: Allotment society" })
      .click();
    await expect(toast(page, "Rule paused")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resume: Allotment society" }),
    ).toBeVisible();

    await expect
      .poll(
        async () =>
          financeDb
            .select({ name: rules.name })
            .from(rules)
            .where(
              and(
                eq(rules.householdId, session.householdId),
                eq(rules.name, "Allotment society"),
                isNotNull(rules.pausedAt),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toHaveLength(1);
  });

  test("an exchange rate and a payee's bank name sync", async ({
    page,
    session,
    financeDb,
  }) => {
    await openSettings(page, "exchange-rates", "Exchange rates");
    await page.getByRole("button", { name: "Update rate: USD" }).click();
    await page.getByRole("textbox", { name: /1 USD = \? GBP/ }).fill("0.8123");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("1 USD = 0.8123 GBP")).toBeVisible();
    await expect
      .poll(
        async () =>
          financeDb
            .select({ rate: fxRates.rate })
            .from(fxRates)
            .where(
              and(
                eq(fxRates.householdId, session.householdId),
                eq(fxRates.base, "USD"),
                eq(fxRates.quote, "GBP"),
              ),
            )
            .then((rows) => rows.map((row) => row.rate)),
        { timeout: SYNC_TIMEOUT },
      )
      .toContain(0.8123);

    await openSettings(page, "payees", "Payees");
    await page
      .getByRole("button", { name: /^Tesco/ })
      .first()
      .click();
    const bankName = page.getByRole("textbox", { name: "Add a bank name" });
    const add = page.getByRole("button", { name: "Add", exact: true });
    await expect(async () => {
      await bankName.fill("tesco express 1234 london");
      await expect(add).toBeEnabled({ timeout: 1000 });
    }).toPass();
    await add.click();
    await expect(
      page.getByText("TESCO EXPRESS", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Payee saved")).toBeVisible();

    await expect
      .poll(
        async () =>
          financeDb
            .select({ alias: payeeAliases.alias })
            .from(payeeAliases)
            .where(
              and(
                eq(payeeAliases.householdId, session.householdId),
                eq(payeeAliases.alias, "TESCO EXPRESS"),
              ),
            ),
        { timeout: SYNC_TIMEOUT },
      )
      .toHaveLength(1);
  });

  test("the owner pastes a Lunch Flow key; bank links connect fake accounts; “Sync now” sums up and leads to Review", async ({
    page,
    session,
    financeDb,
  }) => {
    await openSettings(page, "connections", "Connections");
    await page
      .getByLabel("Lunch Flow API key")
      .fill("lf-e2e-key-0000-abcd", { timeout: SYNC_TIMEOUT });
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(toast(page, "Lunch Flow connected")).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    await expect(page.getByText(/^API key ending in abcd/)).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    expect(await page.content()).not.toContain("lf-e2e-key-0000-abcd");

    const link = page.getByRole("button", { name: /^Link suggested \(\d+\)$/ });
    await expect(link).toBeVisible({ timeout: SYNC_TIMEOUT });
    await link.click();
    await expect(toast(page, "Bank links saved")).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
    await expect(page.getByText("Linked").first()).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await financeDb
              .select({ id: bankLinks.id })
              .from(bankLinks)
              .where(eq(bankLinks.householdId, session.householdId))
          ).length,
        { timeout: SYNC_TIMEOUT },
      )
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: "Sync now" }).click();
    const summary = toast(page, /\d+ new, \d+ matched, \d+ to review/);
    await expect(summary).toBeVisible({ timeout: 60_000 });
    await summary.getByRole("button", { name: "View" }).click();
    await page.waitForURL(
      (url) =>
        url.pathname === "/finance/transactions" &&
        url.searchParams.get("review") === "1",
    );
    await expect(
      page.getByRole("button", { name: "Looks right" }).first(),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });
  });
});
