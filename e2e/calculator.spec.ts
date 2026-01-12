import { test, expect } from "@playwright/test";

test.describe("Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/calculator");
    // Wait for calculator buttons to be visible
    await expect(page.getByRole("button", { name: "0" })).toBeVisible();
  });

  test("displays all calculator buttons", async ({ page }) => {
    // Number buttons
    for (const num of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      await expect(page.getByRole("button", { name: num })).toBeVisible();
    }

    // Operator buttons
    await expect(page.getByRole("button", { name: "+" })).toBeVisible();
    await expect(page.getByRole("button", { name: "−" })).toBeVisible();
    await expect(page.getByRole("button", { name: "×" })).toBeVisible();
    await expect(page.getByRole("button", { name: "÷" })).toBeVisible();

    // Special buttons
    await expect(page.getByRole("button", { name: /ac/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "=" })).toBeVisible();
    await expect(page.getByRole("button", { name: "±" })).toBeVisible();
    await expect(page.getByRole("button", { name: "%" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: ".", exact: true }),
    ).toBeVisible();
  });

  test("performs addition", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "+" }).click();
    await page.getByRole("button", { name: "3" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("5");
  });

  test("performs subtraction", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "9" }).click();
    await page.getByRole("button", { name: "−" }).click();
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("5");
  });

  test("performs multiplication", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "3" }).click();
    await page.getByRole("button", { name: "×" }).click();
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("12");
  });

  test("performs division", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "8" }).click();
    await page.getByRole("button", { name: "÷" }).click();
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("4");
  });

  test("respects operator precedence", async ({ page }) => {
    const result = page.getByRole("status");

    // 2 + 3 × 4 = 14 (not 20)
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "+" }).click();
    await page.getByRole("button", { name: "3" }).click();
    await page.getByRole("button", { name: "×" }).click();
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("14");
  });

  test("handles negate operator", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "±" }).click();

    await expect(result).toHaveText("-5");
  });

  test("handles percent operator", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "0" }).click();
    await page.getByRole("button", { name: "%" }).click();

    await expect(result).toHaveText("0.5");
  });

  test("shows error for division by zero", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "÷" }).click();
    await page.getByRole("button", { name: "0" }).click();
    await page.getByRole("button", { name: "=" }).click();

    await expect(result).toHaveText("Error");
  });

  test("clears display with AC button", async ({ page }) => {
    const result = page.getByRole("status");

    // Enter some numbers
    await page.getByRole("button", { name: "1" }).click();
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "3" }).click();

    // Verify 123 is displayed
    await expect(result).toHaveText("123");

    // Press AC
    await page.getByRole("button", { name: /ac/i }).click();

    // Verify display shows 0
    await expect(result).toHaveText("0");
  });

  test("prevents multiple decimal points", async ({ page }) => {
    const result = page.getByRole("status");
    const decimalButton = page.getByRole("button", { name: ".", exact: true });

    await page.getByRole("button", { name: "1" }).click();
    await decimalButton.click();
    await page.getByRole("button", { name: "2" }).click();
    await decimalButton.click(); // Should be ignored
    await page.getByRole("button", { name: "3" }).click();

    // Should show 1.23, not 1.2.3
    await expect(result).toHaveText("1.23");
  });

  test("normalizes leading zeros", async ({ page }) => {
    const result = page.getByRole("status");

    await page.getByRole("button", { name: "0" }).click();
    await page.getByRole("button", { name: "0" }).click();
    await page.getByRole("button", { name: "7" }).click();

    // Should show 7, not 007
    await expect(result).toHaveText("7");
  });
});
