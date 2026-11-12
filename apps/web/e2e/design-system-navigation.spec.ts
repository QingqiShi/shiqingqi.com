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

test("the wheel scrolls the page beside the sidebar, which stays in place", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PATH);
  const sidebar = page.getByRole("region", { name: "Design system" });
  const heading = page.getByRole("heading", { level: 1 });
  const sidebarTop = (await sidebar.boundingBox())?.y;
  const headingTop = (await heading.boundingBox())?.y ?? 0;

  await page.mouse.move(900, 450);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(async () => (await heading.boundingBox())?.y)
    .toBeLessThan(headingTop);
  expect((await sidebar.boundingBox())?.y).toBe(sidebarTop);
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("a page opens by itself, its way back leads to the list of pages, and a link there opens another page", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Principles",
    );

    await page
      .getByRole("main")
      .getByRole("link", { name: "Design system" })
      .first()
      .click();
    await expect(page).toHaveURL(/design-system\/contents$/);
    const nav = page.getByRole("navigation", { name: "Design system" });
    await expect(nav.getByRole("link", { name: "Principles" })).toBeVisible();
    await waitForMotionToSettle(page);

    await nav.getByRole("link", { name: "Customisation" }).click();
    await expect(page).toHaveURL(/foundations\/customization$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Customisation",
    );
  });
});
