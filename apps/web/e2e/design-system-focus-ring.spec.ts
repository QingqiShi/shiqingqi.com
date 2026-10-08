import { expect, type Page, test } from "@playwright/test";
import { DESIGN_SYSTEM_PATHS } from "../src/design-system/routes/design-system-paths.ts";
import { inspectFocusRing } from "./helpers/inspect-focus-ring.ts";
import { PRODUCT_ROUTES } from "./helpers/product-routes.ts";

const WIDTHS = [390, 1440];

// More stops than the longest page has. A list that loads more as focus
// reaches its end never wraps, so the walk stops here.
const MAX_TAB_STOPS = 400;

interface Route {
  name: string;
  path: string;
  /** An element that shows the route has rendered. */
  ready: string;
  /** Opens a state that a tab walk from the route does not reach. */
  open?: (page: Page) => Promise<unknown>;
}

const ROUTES: Route[] = [
  ...DESIGN_SYSTEM_PATHS.map((path) => ({
    name: path,
    path,
    ready: "main h1",
  })),
  ...PRODUCT_ROUTES.map(({ path, ready }) => ({ name: path, path, ready })),
  {
    name: "creature wizard",
    path: "/pixel-creature-creator/create",
    ready: '[data-testid="wizard-next"]',
  },
  {
    name: "creature review",
    path: "/pixel-creature-creator",
    ready: "h1",
    open: async (page) => {
      await page.locator('a[data-testid^="featured-"]').first().click();
      await page.getByTestId("review-screen").waitFor();
    },
  },
  {
    name: "taste preferences",
    path: "/movie-database",
    ready: "main",
    open: (page) => page.getByRole("button", { name: "Preferences" }).click(),
  },
];

async function tabThrough(page: Page) {
  const failures: string[] = [];
  let checked = 0;
  for (let stop = 0; stop < MAX_TAB_STOPS; stop++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(inspectFocusRing);
    if (result.status === "repeat") return { failures, checked };
    if (result.status === "fail") failures.push(result.failure);
    if (result.status !== "none") checked++;
  }
  return { failures, checked };
}

test.describe("focus ring check", () => {
  test("tells the system ring from a missing or clipped one", async ({
    page,
  }) => {
    await page.setContent(`
      <style>
        .ring:focus-visible { outline: 2px solid rgb(160, 67, 208); outline-offset: 2px; }
        .after { position: relative; outline: 2px solid transparent; }
        .after::after { content: ""; position: absolute; inset: 0; outline: 2px solid transparent; }
        .after:focus-visible::after { outline-color: rgb(160, 67, 208); }
        .frame:has(input:focus-visible) { outline: 2px solid rgb(160, 67, 208); }
      </style>
      <form class="frame"><input aria-label="Framed" style="outline: none"></form>
      <button class="ring">Ringed</button>
      <button>Bare</button>
      <div style="overflow: hidden; padding: 0"><button class="ring">Clipped</button></div>
      <div style="overflow: hidden; padding: 8px"><button class="ring">Room</button></div>
      <a class="after" href="#tile">Tile</a>
      <button class="ring" style="outline-color: rgb(160 67 208 / 0.5)">Faint</button>
    `);

    const { failures, checked } = await tabThrough(page);
    expect(checked).toBe(7);
    // The browser's own ring colour differs by platform.
    expect(failures.map((failure) => failure.replace(/ \(.*\)$/, ""))).toEqual([
      '<button> "Bare": no system ring',
      '<button> "Clipped": ring clipped by <div> "Clipped"',
      '<button> "Faint": no system ring',
    ]);
  });
});

async function expectFocusRings(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const { failures } = await tabThrough(page);
  expect
    .soft(failures, "Every tab stop draws the system focus ring, unclipped")
    .toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`focus rings at ${String(width)}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(async ({ page }) => {
      // A long page takes hundreds of tab stops.
      test.slow();
      await page.emulateMedia({ reducedMotion: "reduce" });
    });

    for (const route of ROUTES) {
      test(route.name, async ({ page }) => {
        await page.goto(route.path);
        // A dev server compiles a route on the first hit, which outruns the
        // default expect timeout.
        await expect(page.locator(route.ready).first()).toBeVisible({
          timeout: 60_000,
        });
        await route.open?.(page);
        await expectFocusRings(page);
      });
    }
  });
}
