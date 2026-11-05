import { waitForMotionToSettle } from "./helpers/motion.ts";
import { expect, test } from "./helpers/test.ts";

const PATH = "/design-system/foundations/principles";

test("a category in the sidebar opens and closes, and the current one starts open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PATH);
  const nav = page.getByRole("navigation", { name: "Design system" });
  const basics = nav.getByRole("button", { name: "Basics" });
  const visual = nav.getByRole("button", { name: "Visual" });
  const current = nav.getByRole("link", { name: "Principles" });
  const colour = nav.getByRole("link", { name: "Colour" });

  await expect(basics).toHaveAttribute("aria-expanded", "true");
  await expect(current).toBeVisible();
  await expect(visual).toHaveAttribute("aria-expanded", "false");
  await expect(colour).toBeHidden();

  await visual.click();
  await expect(visual).toHaveAttribute("aria-expanded", "true");
  await expect(colour).toBeVisible();

  await colour.click();
  await expect(page).toHaveURL(/foundations\/color$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Colour");
  await expect(colour).toHaveAttribute("aria-current", "page");
});

test("the wheel scrolls the document, and the sidebar stays in place", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PATH);
  const sidebar = page.getByRole("region", { name: "Design system" });
  const sidebarTop = (await sidebar.boundingBox())?.y;

  await page.mouse.move(900, 450);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => document.scrollingElement?.scrollTop))
    .toBeGreaterThan(0);
  expect((await sidebar.boundingBox())?.y).toBe(sidebarTop);
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("the menu opens the sidebar as a drawer, which a link closes on its way to the page", async ({
    page,
  }) => {
    await page.goto(PATH);
    const menu = page.getByRole("button", { name: "Design system menu" });
    const drawer = page.getByRole("dialog", { name: "Design system menu" });

    await menu.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Home" })).toBeVisible();
    await waitForMotionToSettle(page);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await waitForMotionToSettle(page);
    await drawer.getByRole("link", { name: "Customisation" }).click();
    await expect(page).toHaveURL(/foundations\/customization$/);
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Customisation",
    );
  });
});
