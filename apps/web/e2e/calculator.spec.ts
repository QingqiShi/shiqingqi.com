import { test, expect } from "@playwright/test";

test("the calculator respects operator precedence", async ({ page }) => {
  await page.goto("/en/calculator");
  await expect(page.getByRole("button", { name: "0" })).toBeVisible();

  // 2 + 3 × 4 = 14 (not 20)
  await page.getByRole("button", { name: "2" }).click();
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "3" }).click();
  await page.getByRole("button", { name: "Multiply" }).click();
  await page.getByRole("button", { name: "4" }).click();
  await page.getByRole("button", { name: "Equals" }).click();

  await expect(page.getByRole("status")).toHaveText("14");
});
