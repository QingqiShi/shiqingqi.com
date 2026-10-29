import {
  expect,
  getFinanceApi,
  readSession,
  signInWithPasskey,
  signUpWithEmail,
  test,
  uniqueEmail,
} from "./finance-test.ts";
import { clickSignOut, DESKTOP } from "./transactions-page.ts";

test.describe("Finance sign-in", () => {
  test("a visit without a session goes to sign-in with the page as next", async ({
    page,
  }) => {
    await page.goto("/transactions?review=1");
    await expect(page).toHaveURL("/sign-in?next=%2Ftransactions%3Freview%3D1");
  });

  test.describe("at 1440 px", () => {
    test.use({ viewport: DESKTOP });

    test("sign up with a passkey, sign out, then sign in with the same passkey", async ({
      page,
      passkeys: _passkeys,
    }) => {
      await signUpWithEmail(page, { email: uniqueEmail("alex") });
      const signedUp = await readSession(page);
      expect(signedUp.role).toBe("owner");

      await clickSignOut(page);
      await expect(page).toHaveURL("/sign-in");
      expect((await getFinanceApi(page, "/api/auth/session")).status()).toBe(
        401,
      );

      await signInWithPasskey(page);
      const signedIn = await readSession(page);
      expect(signedIn.userId).toBe(signedUp.userId);
      expect(signedIn.householdId).toBe(signedUp.householdId);
    });
  });
});
