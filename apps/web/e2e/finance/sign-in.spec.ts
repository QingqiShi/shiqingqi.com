import {
  expect,
  getFinanceApi,
  readSession,
  signInWithPasskey,
  signUpWithEmail,
  test,
  uniqueEmail,
} from "./finance-test.ts";
import { clickSignOut } from "./transactions-page.ts";

test.describe("Finance sign-in", () => {
  test("a visit without a session goes to sign-in with the page as next", async ({
    page,
  }) => {
    await page.goto("/finance/transactions?review=1");
    await expect(page).toHaveURL(
      "/finance/sign-in?next=%2Ffinance%2Ftransactions%3Freview%3D1",
    );
    await expect(
      page.getByRole("button", { name: "Sign in with a passkey" }),
    ).toBeVisible();

    await page.goto("/zh/finance/transactions");
    await expect(page).toHaveURL(
      "/zh/finance/sign-in?next=%2Ffinance%2Ftransactions",
    );
    await expect(
      page.getByRole("button", { name: "使用通行密钥登录" }),
    ).toBeVisible();
  });

  test("a signed-out visitor who opens the Finance card on the home page goes to sign-in", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /finance.*money tracker/i }).click();
    await expect(page).toHaveURL("/finance/sign-in");
    await expect(
      page.getByRole("button", { name: "Sign in with a passkey" }),
    ).toBeVisible();

    await page.goto("/zh");
    await page.getByRole("link", { name: /家庭账本.*私人账本/ }).click();
    await expect(page).toHaveURL("/zh/finance/sign-in");
    await expect(
      page.getByRole("button", { name: "使用通行密钥登录" }),
    ).toBeVisible();
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`at ${String(viewport.width)} px`, () => {
      test.use({ viewport });

      test("sign up with a passkey, sign out, then sign in with the same passkey", async ({
        page,
        passkeys: _passkeys,
      }) => {
        await signUpWithEmail(page, { email: uniqueEmail("alex") });
        const signedUp = await readSession(page);
        expect(signedUp.role).toBe("owner");

        if (viewport.width < 768) {
          await page.getByRole("link", { name: "Settings" }).click();
        }
        await clickSignOut(page);
        await expect(page).toHaveURL("/finance/sign-in");
        expect(
          (await getFinanceApi(page, "/api/finance/auth/session")).status(),
        ).toBe(401);

        await signInWithPasskey(page);
        const signedIn = await readSession(page);
        expect(signedIn.userId).toBe(signedUp.userId);
        expect(signedIn.householdId).toBe(signedUp.householdId);
      });
    });
  }
});
