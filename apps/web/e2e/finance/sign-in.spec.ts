import {
  claimWithPasskey,
  expect,
  getFinanceApi,
  readSession,
  test,
} from "./finance-test.ts";

test.describe("Finance sign-in", () => {
  test("a visit without a session goes to sign-in with the page as next", async ({
    page,
    financeUnavailable,
  }) => {
    test.skip(financeUnavailable !== null, financeUnavailable ?? "");

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
    financeUnavailable,
  }) => {
    test.skip(financeUnavailable !== null, financeUnavailable ?? "");

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

      test("claim with a passkey, sign out, then sign in with the same passkey", async ({
        page,
        passkeys: _passkeys,
        unclaimedHousehold: _household,
      }) => {
        await page.goto("/finance/sign-in");
        await expect(
          page.getByRole("heading", { name: "Claim your place" }),
        ).toBeVisible();
        await expect(
          page.getByRole("main").getByText("Join as Alex · Home"),
        ).toBeVisible();

        await claimWithPasskey(page, "/finance/transactions");
        await expect(
          page.getByRole("heading", { level: 1, name: "Transactions" }),
        ).toBeVisible();
        const claimed = await readSession(page);
        expect(claimed.role).toBe("owner");

        if (viewport.width < 768) {
          await page.getByRole("button", { name: "Finance menu" }).click();
        }
        await page.getByRole("button", { name: "Sign out" }).click();
        await expect(page).toHaveURL("/finance/sign-in");
        expect(
          (await getFinanceApi(page, "/api/finance/auth/session")).status(),
        ).toBe(401);

        await page
          .getByRole("button", { name: "Sign in with a passkey" })
          .click();
        await expect(page).toHaveURL("/finance");
        const signedIn = await readSession(page);
        expect(signedIn.userId).toBe(claimed.userId);
        expect(signedIn.householdId).toBe(claimed.householdId);
      });
    });
  }
});
