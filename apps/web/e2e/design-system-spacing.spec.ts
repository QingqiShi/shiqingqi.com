import { expect, test } from "@playwright/test";
import { selectedSelector } from "@tuja/ui/primitives/selected-selector";
import { DESIGN_SYSTEM_PATHS } from "../src/design-system/routes/design-system-paths.ts";
import { expectSpacing } from "./helpers/expect-spacing.ts";
import { measureSpacing } from "./helpers/measure-spacing.ts";
import { PRODUCT_ROUTES } from "./helpers/product-routes.ts";

const WIDTHS = [390, 1440];

const DOC_ROOT = ["main article", "main"];

// The sidebar is the same on every design-system route.
const SIDEBAR_PATH = "/design-system/foundations/get-started";
const SIDEBAR_ROOT = ['nav[aria-label="Design system"]'];

test.describe("spacing check", () => {
  test("tells real spacing from touching blocks", async ({ page }) => {
    await page.setContent(`
      <main><article style="font: 16px/1.5 sans-serif">
        <section style="display: flex; flex-direction: column; gap: 16px; padding-top: 48px">
          <h2 style="margin: 0">Spaced</h2>
          <p style="margin: 0">Its own text.</p>
        </section>
        <section style="display: flex; flex-direction: column; gap: 16px; padding-top: 32px">
          <h2 style="margin: 0">Unboxed</h2>
          <span style="display: contents"><p style="margin: 0">Its own text.</p></span>
          <p style="margin: 0">More text.</p>
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
        <div style="display: flex; flex-direction: column">
          <p style="margin: 0">Term</p>
          <p style="margin: 0">Note</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <p style="margin: 0">Title</p>
          <p style="margin: 0">Its own text.</p>
        </div>
        <div style="display: flex; flex-direction: column">
          <p style="margin: 0">Label</p>
          <p style="margin: 0; background: silver">Boxed</p>
        </div>
        <div style="display: flex; flex-direction: column">
          <a href="#" style="padding: 8px">Padded link</a>
          <a href="#" style="padding: 8px">Padded link</a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <a href="#" style="padding: 8px">Gapped row</a>
          <a href="#" aria-current="page" style="padding: 8px; background: silver">Gapped row</a>
        </div>
        <ul style="display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none">
          <li><a href="#" style="display: block; padding: 8px">Listed row</a></li>
          <li><a href="#" style="display: block; padding: 8px">Listed row</a></li>
        </ul>
        <div style="display: flex; gap: 8px">
          <a href="#" style="padding: 8px">Tab</a>
          <a href="#" style="padding: 8px">Tab</a>
        </div>
        <div style="display: flex; gap: 2px; background: silver">
          <button style="padding: 0 8px; background: none; border: 0">Segment</button>
          <button style="padding: 0 8px; background: none; border: 0">Segment</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <a href="#" style="padding: 8px; background: silver">Pill</a>
          <a href="#" style="padding: 8px; background: silver">Pill</a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <a href="#">Bare link</a>
          <a href="#">Bare link</a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <a href="#" style="padding: 8px">Before</a>
          <div role="group" aria-labelledby="near" style="display: flex; flex-direction: column; gap: 8px">
            <span id="near">Near label</span>
            <a href="#" style="padding: 8px">Grouped</a>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <button><span id="trigger">Trigger</span></button>
          <div role="group" aria-labelledby="trigger"><a href="#">Inside</a></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 40px">
          <p style="margin: 0">Before</p>
          <div role="group" aria-labelledby="far" style="display: flex; flex-direction: column; gap: 8px">
            <span id="far">Far label</span>
            <a href="#" style="padding: 8px">Grouped</a>
          </div>
        </div>
        <div style="display: flex; flex-direction: column">
          <p style="margin: 0; border-bottom: 1px solid">Divided row</p>
          <p style="margin: 0">Divided row</p>
        </div>
        <div style="display: flex; flex-wrap: wrap">
          <button style="margin: 0">One</button>
          <button style="margin: 0">Two</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px">
          <form style="display: flex; flex-direction: column; gap: 8px">
            <input>
            <p role="status" style="margin: 0"></p>
            <p role="status" style="margin: 0; position: absolute"></p>
          </form>
          <input>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <p style="margin: 0">Group label</p>
          <ul style="margin: 0"><li>First</li><li>Second</li></ul>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <div data-spacing-scope><p style="margin: 0">Staged sample</p></div>
          <p style="margin: 0">Its caption</p>
        </div>
        <div style="display: flex; flex-direction: column">
          <a href="#tile">Tile title</a>
          <span>Tile text</span>
        </div>
        <div style="display: flex; flex-direction: column">
          <h2 style="margin: 0; font-size: 24px; line-height: 1.2">Large</h2>
          <div style="display: flex; flex-direction: column; gap: 16px">
            <p style="margin: 0">Its own text.</p>
            <input>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 16px">
          <h2 style="margin: 0; font-size: 24px; line-height: 1.2">Spaced large</h2>
          <p style="margin: 0">Its own text.</p>
        </div>
        <div aria-hidden="true" style="display: flex; flex-direction: column">
          <p style="margin: 0">Drawn</p>
          <p style="margin: 0">Drawn</p>
        </div>
      </article></main>
    `);

    const report = await page.evaluate(measureSpacing, {
      roots: DOC_ROOT,
      selected: selectedSelector,
    });
    expect(report.headings.map((failure) => failure.heading)).toEqual([
      '<h2> "Cramped"',
      '<span> "Near label"',
    ]);
    expect(report.stacks.map((failure) => failure.container)).toEqual([
      '<div> "Label Boxed"',
      '<div> "One Two"',
    ]);
    expect(report.empties).toEqual([
      { container: '<form> ""', empty: '<p> ""' },
    ]);
    expect(report.texts.map((failure) => failure.container)).toEqual([
      '<div> "Staged text Staged"',
      '<div> "Title Its own text."',
      '<div> "Large Its own text."',
    ]);
    expect(report.paddedRows).toEqual([
      {
        container: '<div> "Gapped row Gapped row"',
        first: '<a> "Gapped row"',
        second: '<a> "Gapped row"',
        gap: 8,
      },
      {
        container: '<ul> "Listed row Listed row"',
        first: '<a> "Listed row"',
        second: '<a> "Listed row"',
        gap: 8,
      },
      {
        container: '<div> "Tab Tab"',
        first: '<a> "Tab"',
        second: '<a> "Tab"',
        gap: 8,
      },
    ]);
  });
});

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

test.describe("spacing of the design-system sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("rail at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SIDEBAR_PATH);
    await expect(page.locator(SIDEBAR_ROOT[0])).toBeVisible({
      timeout: 60_000,
    });
    await expectSpacing(page, SIDEBAR_ROOT);
  });

  test("open drawer at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(SIDEBAR_PATH);
    await expect(page.locator("main h1").first()).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "Design system menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Design system menu" }),
    ).toBeVisible();
    await expect(page.locator(SIDEBAR_ROOT[0])).toBeVisible();
    await expectSpacing(page, SIDEBAR_ROOT);
  });
});
