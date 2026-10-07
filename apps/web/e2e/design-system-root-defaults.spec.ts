import { expect, type Page, test } from "@playwright/test";
import { DESIGN_SYSTEM_PATHS } from "../src/design-system/routes/design-system-paths.ts";
import { PRODUCT_ROUTES } from "./helpers/product-routes.ts";

/** Not the usual 16px, so a root pinned to 16px cannot pass by accident. */
const BROWSER_FONT_SIZE = 20;

const MIN_BODY_LEADING = 1.4;

async function setBrowserFontSize(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("Page.setFontSizes", {
    fontSizes: { standard: BROWSER_FONT_SIZE },
  });
}

function readRootDefaults() {
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  // A Specimen shows a component with the props its caption names, which
  // can be another wrap.
  const unbalanced = [
    ...document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ].filter(
    (heading) =>
      heading.closest("[data-spacing-scope]") === null &&
      getComputedStyle(heading).getPropertyValue("text-wrap-style") !==
        "balance",
  );
  return {
    htmlFontSize: parseFloat(html.fontSize),
    bodyLeading: parseFloat(body.lineHeight) / parseFloat(body.fontSize),
    bodyWrap: body.getPropertyValue("text-wrap-style"),
    unbalanced: unbalanced.map(
      (heading) =>
        `<${heading.tagName.toLowerCase()}> "${heading.textContent.trim().slice(0, 60)}"`,
    ),
  };
}

async function expectRootDefaults(page: Page) {
  const defaults = await page.evaluate(readRootDefaults);
  expect
    .soft(defaults.htmlFontSize, "The root follows the browser font size")
    .toBe(BROWSER_FONT_SIZE);
  expect
    .soft(defaults.bodyLeading, "Body text has a reading leading")
    .toBeGreaterThanOrEqual(MIN_BODY_LEADING);
  expect.soft(defaults.bodyWrap, "Body text wraps pretty").toBe("pretty");
  expect.soft(defaults.unbalanced, "Every heading balances").toEqual([]);
}

test.describe("root defaults", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setBrowserFontSize(page);
  });

  for (const path of DESIGN_SYSTEM_PATHS) {
    test(path, async ({ page }) => {
      await page.goto(path);
      // A dev server compiles a route on the first hit, which outruns the
      // default expect timeout.
      await expect(page.locator("main h1").first()).toBeVisible({
        timeout: 60_000,
      });
      await expectRootDefaults(page);
    });
  }

  for (const route of PRODUCT_ROUTES) {
    test(route.path, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator(route.ready).first()).toBeVisible({
        timeout: 60_000,
      });
      await expectRootDefaults(page);
    });
  }
});
