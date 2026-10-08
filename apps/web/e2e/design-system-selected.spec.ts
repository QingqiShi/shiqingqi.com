import { expect, type Locator, test } from "@playwright/test";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

function background(locator: Locator) {
  return locator.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
}

function setAttribute(locator: Locator, name: string, value: string | null) {
  return locator.evaluate(
    (element, [attribute, next]) => {
      if (next === null) element.removeAttribute(attribute);
      else element.setAttribute(attribute, next);
    },
    [name, value] as const,
  );
}

test.describe("selected primitive", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/design-system/primitives");
    // Without transitions, a computed colour is final as soon as the
    // attribute changes, so a check for "no change" cannot pass too early.
    await page.addStyleTag({
      content: "*, *::before, *::after { transition: none !important; }",
    });
  });

  test("quiet follows aria-checked as the visitor picks", async ({ page }) => {
    const group = page.getByTestId("selected-quiet-specimen");
    const day = group.getByRole("radio", { name: "Day" });
    const week = group.getByRole("radio", { name: "Week" });
    await expect(week).toHaveAttribute("aria-checked", "true");

    const selectedBackground = await background(week);
    expect(selectedBackground).not.toBe(TRANSPARENT);
    expect(await background(day)).toBe(TRANSPARENT);

    await day.click();
    await expect(day).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => background(day)).toBe(selectedBackground);
    await expect.poll(() => background(week)).toBe(TRANSPARENT);
  });

  test("quiet reads every selecting ARIA state", async ({ page }) => {
    const group = page.getByTestId("selected-quiet-specimen");
    const week = group.getByRole("radio", { name: "Week" });
    const month = group.getByRole("radio", { name: "Month" });
    const selectedBackground = await background(week);
    await setAttribute(month, "aria-checked", null);

    for (const [name, value] of [
      ["aria-pressed", "true"],
      ["aria-checked", "true"],
      ["aria-selected", "true"],
      ["aria-current", "page"],
      ["aria-current", "true"],
    ] as const) {
      await setAttribute(month, name, value);
      await expect
        .poll(() => background(month), { message: `${name}="${value}"` })
        .toBe(selectedBackground);
      await setAttribute(month, name, null);
      await expect
        .poll(() => background(month), { message: `no ${name}` })
        .toBe(TRANSPARENT);
    }

    for (const [name, value] of [
      ["aria-pressed", "false"],
      ["aria-pressed", "mixed"],
      ["aria-checked", "false"],
      ["aria-selected", "false"],
      ["aria-current", "false"],
      ["aria-current", ""],
    ] as const) {
      await setAttribute(month, name, value);
      expect(await background(month), `${name}="${value}"`).toBe(TRANSPARENT);
      await setAttribute(month, name, null);
    }
  });

  test("marked adds the accent border to the picked choice", async ({
    page,
  }) => {
    const group = page.getByTestId("selected-marked-specimen");
    const monthly = group.getByRole("radio", { name: /Monthly/ });
    const yearly = group.getByRole("radio", { name: /Yearly/ });
    await expect(yearly).toHaveAttribute("aria-checked", "true");

    const border = (locator: Locator) =>
      locator.evaluate((element) => getComputedStyle(element).borderTopColor);
    const pickedBorder = await border(yearly);
    expect(pickedBorder).not.toBe(TRANSPARENT);
    expect(await border(monthly)).toBe(TRANSPARENT);

    await monthly.click();
    await expect.poll(() => border(monthly)).toBe(pickedBorder);
    await expect.poll(() => border(yearly)).toBe(TRANSPARENT);
  });
});
