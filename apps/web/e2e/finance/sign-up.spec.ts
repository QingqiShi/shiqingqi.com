import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import {
  accounts,
  categories,
  households,
  transactions,
  users,
} from "../../src/finance/db/schema.ts";
import {
  addVirtualAuthenticator,
  emailTo,
  expect,
  linkIn,
  readSession,
  signUpWithEmail,
  test,
  uniqueEmail,
} from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT, toast } from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

async function openMembers(page: Page) {
  await page.goto("/finance/settings/members");
  await expect(
    page.getByRole("heading", { level: 2, name: "Members" }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

test.describe("Sign-up", () => {
  test("a visitor signs up with the emailed code and gets a household named after them, invites a member, and a second sign-up with the same email gets a Recovery link, not a household", async ({
    page,
    passkeys: _passkeys,
    financeDb,
    browser,
  }) => {
    const ownerEmail = uniqueEmail("owner");

    await signUpWithEmail(page, { email: ownerEmail, name: "Riley" });
    const owner = await readSession(page);
    expect(owner.role).toBe("owner");
    expect(
      await financeDb
        .select({ name: households.name })
        .from(households)
        .where(eq(households.id, owner.householdId)),
    ).toEqual([{ name: "Riley" }]);
    const [ownerUser] = await financeDb
      .select({ email: users.email, verifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, owner.userId));
    expect(ownerUser.email).toBe(ownerEmail);
    expect(ownerUser.verifiedAt).not.toBeNull();
    expect(
      await financeDb.$count(
        accounts,
        eq(accounts.householdId, owner.householdId),
      ),
    ).toBe(0);
    expect(
      await financeDb.$count(
        transactions,
        eq(transactions.householdId, owner.householdId),
      ),
    ).toBe(0);
    expect(
      await financeDb
        .select({ name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.householdId, owner.householdId),
            eq(categories.isSystem, true),
          ),
        ),
    ).toHaveLength(2);

    await page.getByRole("button", { name: "Add account" }).click();
    const editor = page.getByRole("form", { name: "New account" });
    await editor.getByRole("textbox", { name: "Name" }).fill("Current");
    const group = editor.getByRole("combobox", { name: "Group" });
    await expect(group.locator("option:checked")).toHaveText("Cash");
    await editor
      .getByRole("combobox", { name: "Kind" })
      .selectOption("Credit card");
    await expect(group.locator("option:checked")).toHaveText("Credit cards");
    await editor
      .getByRole("combobox", { name: "Kind" })
      .selectOption("Cash (current or savings)");
    await expect(group.locator("option:checked")).toHaveText("Cash");
    await editor.getByRole("textbox", { name: "Balance today" }).fill("100");
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Account saved")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Current/ })).toBeVisible();

    await openMembers(page);
    await page.getByRole("button", { name: "Member", exact: true }).click();
    await page.getByRole("textbox", { name: /Name/ }).fill("Sam");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Member added")).toBeVisible();
    await page.getByRole("button", { name: "Create invite link: Sam" }).click();
    const link = page.getByRole("textbox", { name: "Link" });
    await expect(link).toHaveValue(/\/finance\/invite\//, {
      timeout: SYNC_TIMEOUT,
    });
    const inviteUrl = await link.inputValue();

    const samContext = await browser.newContext({ viewport: DESKTOP });
    const samPage = await samContext.newPage();
    await addVirtualAuthenticator(samPage);
    const samEmail = uniqueEmail("sam");
    await samPage.goto(inviteUrl);
    await expect(
      samPage.getByRole("heading", { name: "Join Riley" }),
    ).toBeVisible();
    await samPage
      .getByRole("textbox", { name: "Recovery email" })
      .fill(samEmail);
    await samPage.getByRole("button", { name: "Create a passkey" }).click();
    await samPage.waitForURL((url) => url.pathname === "/finance");
    const sam = await readSession(samPage);
    expect(sam).toMatchObject({
      householdId: owner.householdId,
      role: "member",
    });
    const confirmation = await emailTo(
      samEmail,
      "Confirm your Finance recovery email",
    );
    await samPage.goto(linkIn(confirmation, "/finance/verify-email/"));
    await samPage.getByRole("button", { name: "Confirm email" }).click();
    await expect(
      samPage.getByRole("heading", { name: "Recovery email confirmed" }),
    ).toBeVisible();
    await samContext.close();

    const otherContext = await browser.newContext({ viewport: DESKTOP });
    const otherPage = await otherContext.newPage();
    await addVirtualAuthenticator(otherPage);
    await otherPage.goto("/finance/sign-in");
    await otherPage.getByRole("textbox", { name: /^Email/ }).fill(ownerEmail);
    await otherPage
      .getByRole("button", { name: "Email me a sign-up code" })
      .click();
    await expect(
      otherPage
        .getByRole("status")
        .filter({ hasText: `We sent a code to ${ownerEmail}` }),
    ).toBeVisible();
    const registered = await emailTo(
      ownerEmail,
      /^\d{6} is your Finance code$/,
    );
    await otherPage.goto(linkIn(registered, "/finance/invite/"));
    await expect(
      otherPage.getByRole("heading", { name: "Back into Riley" }),
    ).toBeVisible();
    await otherPage.getByRole("button", { name: "Save a new passkey" }).click();
    await otherPage.waitForURL((url) => url.pathname === "/finance");
    expect(await readSession(otherPage)).toMatchObject({
      householdId: owner.householdId,
      userId: owner.userId,
    });
    expect(
      await financeDb
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, ownerEmail)),
    ).toEqual([{ id: owner.userId }]);
    await otherContext.close();
  });
});
