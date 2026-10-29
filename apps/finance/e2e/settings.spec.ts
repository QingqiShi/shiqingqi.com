import { and, eq } from "drizzle-orm";
import { bankLinks, categories, members } from "../src/finance/db/schema.ts";
import {
  addVirtualAuthenticator,
  expect,
  getFinanceApi,
  test,
  uniqueEmail,
} from "./finance-test.ts";
import {
  DESKTOP,
  inviteMember,
  openSettings,
  SYNC_TIMEOUT,
  toast,
} from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

test.describe("Settings", () => {
  test("a category can be added and renamed, and the change syncs", async ({
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
  });

  test("an owner removes a member: their device is signed out, and Undo brings the member back without access", async ({
    page,
    session,
    financeDb,
    browser,
  }) => {
    const inviteUrl = await inviteMember(page, "Jo");
    const other = await browser.newContext({ viewport: DESKTOP });
    const otherPage = await other.newPage();
    await addVirtualAuthenticator(otherPage);
    await otherPage.goto(inviteUrl);
    await otherPage
      .getByRole("textbox", { name: "Recovery email" })
      .fill(uniqueEmail("jo"));
    await otherPage.getByRole("button", { name: "Create a passkey" }).click();
    await otherPage.waitForURL((next) => next.pathname === "/");
    const joSession = () =>
      getFinanceApi(otherPage, "/api/auth/session").then((response) =>
        response.status(),
      );
    expect(await joSession()).toBe(200);

    await page.getByRole("button", { name: /^Jo/ }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
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

    await page
      .getByRole("combobox", { name: "Feeds this account" })
      .first()
      .selectOption({ index: 1 }, { timeout: SYNC_TIMEOUT });
    await page.getByRole("button", { name: /^Save changes \(\d+\)$/ }).click();
    await expect(toast(page, "Bank links saved")).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });
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
        url.pathname === "/transactions" &&
        url.searchParams.get("review") === "1",
    );
    await expect(
      page.getByRole("button", { name: "Looks right" }).first(),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });
  });
});
