import { eq } from "drizzle-orm";
import { households, users } from "../src/finance/db/schema.ts";
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
import { DESKTOP, inviteMember, toast } from "./transactions-page.ts";

test.use({ viewport: DESKTOP });

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
    await page.getByRole("button", { name: "Add account" }).click();
    const editor = page.getByRole("form", { name: "New account" });
    await editor.getByRole("textbox", { name: "Name" }).fill("Current");
    await editor.getByRole("textbox", { name: "Balance today" }).fill("100");
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Account saved")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Current/ }).first(),
    ).toBeVisible();

    const inviteUrl = await inviteMember(page, "Sam");

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
    await samPage.waitForURL((url) => url.pathname === "/");
    const sam = await readSession(samPage);
    expect(sam).toMatchObject({
      householdId: owner.householdId,
      role: "member",
    });
    await samContext.close();

    const otherContext = await browser.newContext({ viewport: DESKTOP });
    const otherPage = await otherContext.newPage();
    await addVirtualAuthenticator(otherPage);
    await otherPage.goto("/sign-in");
    await otherPage.getByRole("textbox", { name: /^Email/ }).fill(ownerEmail);
    await otherPage
      .getByRole("button", { name: "Email me a sign-up code" })
      .click();
    const registered = await emailTo(
      ownerEmail,
      /^\d{6} is your Finance code$/,
    );
    await otherPage.goto(linkIn(registered, "/invite/"));
    await expect(
      otherPage.getByRole("heading", { name: "Back into Riley" }),
    ).toBeVisible();
    await otherPage.getByRole("button", { name: "Save a new passkey" }).click();
    await otherPage.waitForURL((url) => url.pathname === "/");
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
