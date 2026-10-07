import { expect, type Page, test } from "@playwright/test";
import { DESIGN_SYSTEM_PATHS } from "../src/design-system/routes/design-system-paths.ts";
import { measureSpacing } from "./helpers/measure-spacing.ts";

const WIDTHS = [390, 1440];

const DOC_ROOT = ["main article", "main"];

/**
 * Product routes that render without API keys, each with the element its
 * content is under and an element that shows the route has rendered.
 */
const PRODUCT_ROUTES = [
  { path: "/", root: ["main"], ready: "main h1" },
  { path: "/experiences/spotify", root: ["main"], ready: "main h1" },
  { path: "/movie-database", root: ["main"], ready: "main" },
  { path: "/calculator", root: ["main"], ready: "main" },
  // The landing page has no <main>, so the check starts at the page's own
  // root: the element that holds the hero section.
  {
    path: "/pixel-creature-creator",
    root: ["div:has(> section h1)"],
    ready: "h1",
  },
  { path: "/sprite-editor", root: ["main"], ready: "main" },
];

test.describe("spacing check", () => {
  test("tells real spacing from touching blocks", async ({ page }) => {
    await page.setContent(`
      <main><article style="font: 16px/1.5 sans-serif">
        <section style="display: flex; flex-direction: column; gap: 16px; padding-top: 48px">
          <h2 style="margin: 0">Spaced</h2>
          <p style="margin: 0">Its own text.</p>
        </section>
        <section style="display: flex; flex-direction: column; gap: 24px">
          <h2 style="margin: 0">Cramped</h2>
          <p style="margin: 0">Its own text.</p>
        </section>
        <section style="display: flex; flex-direction: column; gap: 16px; padding-top: 40px">
          <h2 style="margin: 0">Hairline</h2>
          <div style="display: flex; align-items: center; gap: 16px; height: 40px">
            <span>Inline</span>
            <div style="width: 1px; height: 100%; background: currentColor"></div>
          </div>
        </section>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <div data-spacing-scope style="display: flex; flex-direction: column; gap: 4px">
            <p style="margin: 0">Staged text</p>
            <h3 style="margin: 0">Staged</h3>
          </div>
          <p style="margin: 0">Caption</p>
        </div>
        <div id="touching" style="display: flex; flex-direction: column">
          <p style="margin: 0">Term</p>
          <p style="margin: 0">Note</p>
        </div>
        <div style="display: flex; flex-direction: column">
          <a style="padding: 8px">Padded link</a>
          <a style="padding: 8px">Padded link</a>
        </div>
        <div style="display: flex; flex-direction: column">
          <p style="margin: 0; border-bottom: 1px solid">Divided row</p>
          <p style="margin: 0">Divided row</p>
        </div>
        <div style="display: flex; flex-wrap: wrap">
          <button style="margin: 0">One</button>
          <button style="margin: 0">Two</button>
        </div>
        <div aria-hidden="true" style="display: flex; flex-direction: column">
          <p style="margin: 0">Drawn</p>
          <p style="margin: 0">Drawn</p>
        </div>
      </article></main>
    `);

    const report = await page.evaluate(measureSpacing, DOC_ROOT);
    expect(report.headings.map((failure) => failure.heading)).toEqual([
      '<h2> "Cramped"',
    ]);
    expect(report.stacks.map((failure) => failure.container)).toEqual([
      '<div> "Term Note"',
      '<div> "One Two"',
    ]);
  });
});

async function expectSpacing(page: Page, root: string[]) {
  await page.evaluate(() => document.fonts.ready);
  const report = await page.evaluate(measureSpacing, root);
  expect
    .soft(
      report.headings,
      "Each h2 and h3 has at least twice the space above it as below it",
    )
    .toEqual([]);
  expect.soft(report.stacks, "No two blocks in a stack touch").toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`spacing at ${String(width)}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });

    for (const path of DESIGN_SYSTEM_PATHS) {
      test(path, async ({ page }) => {
        await page.goto(path);
        // A dev server compiles a route on the first hit, which outruns the
        // default expect timeout.
        // Some pages show a heading component as a Specimen, so the page title
        // is the first h1, not the only one.
        await expect(page.locator("main h1").first()).toBeVisible({
          timeout: 60_000,
        });
        await expectSpacing(page, DOC_ROOT);
      });
    }

    for (const route of PRODUCT_ROUTES) {
      test(route.path, async ({ page }) => {
        await page.goto(route.path);
        await expect(page.locator(route.ready).first()).toBeVisible({
          timeout: 60_000,
        });
        await expectSpacing(page, route.root);
      });
    }
  });
}
