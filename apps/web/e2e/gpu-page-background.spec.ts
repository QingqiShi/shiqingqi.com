import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { findStatusBarCandidates } from "./helpers/status-bar.ts";

// Each check takes at least eight full-page screenshots.
test.describe.configure({ timeout: 240_000 });

// When a layer is under the text, Chromium draws the text with greyscale
// antialiasing, not LCD antialiasing. At a device pixel ratio of 1 on Linux
// and Windows, text over the surface thus loses its colour fringes. This
// spec examines the background, so it turns LCD text off. The flags from the
// project stay, because this `launchOptions` replaces them.
test.use({
  launchOptions: {
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-lcd-text",
    ],
  },
});

const SURFACE = "body > canvas[data-state]";
const CANARY_ID = "gpu-surface-canary";

const viewports = [
  {
    name: "phone",
    use: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "desktop",
    use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  },
];

/**
 * Takes screenshots until two in sequence are the same, apart from noise.
 * After a change to the page, a slow runner can show old tiles for some
 * frames.
 */
async function screenshot(page: Page) {
  const take = async () =>
    PNG.sync.read(
      await page.screenshot({ animations: "disabled", caret: "hide" }),
    );
  let previous = await take();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = await take();
    if (findDifferences(previous, next).count <= NOISE_PIXELS) return next;
    previous = next;
  }
  throw new Error("The page did not stop changing");
}

// Not the pure #ff00ff: a filter such as `saturate()` cannot change a
// channel that is at 0 or 255, so a pure colour could hide it.
const MAGENTA = [192, 64, 192];

function rgbAt({ data }: PNG, index: number) {
  return [data[index], data[index + 1], data[index + 2]];
}

function isMagenta(image: PNG, index: number) {
  const [r, g, b] = rgbAt(image, index);
  return r === MAGENTA[0] && g === MAGENTA[1] && b === MAGENTA[2];
}

function hasMagenta(image: PNG) {
  for (let i = 0; i < image.data.length; i += 4) {
    if (isMagenta(image, i)) return true;
  }
  return false;
}

// When a layer is under the content, the compositor blends translucent
// content (such as a shadow, the edge of a glyph, or a backdrop filter) in a
// second step. That step can round a channel differently, so these pixels
// can change by 1 or 2 when the surface shows. Thus the bare surface is
// examined on its own, in `expectSurfaceColor`.
const BLEND_TOLERANCE = 2;

// In headless Chromium, two screenshots of the home page with no change
// between them can differ in up to 7 pixels of one icon, with or without the
// surface. The limit is a little more than that. A surface that does not
// cover the page, or that has a different colour, changes many more pixels.
const NOISE_PIXELS = 12;

function findDifferences(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const differs = (i: number) => {
    const [r, g, b] = rgbAt(actual, i);
    const [er, eg, eb] = rgbAt(expected, i);
    return (
      Math.max(Math.abs(r - er), Math.abs(g - eg), Math.abs(b - eb)) >
      BLEND_TOLERANCE
    );
  };
  let count = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    if (differs(i)) count += 1;
  }
  return { count, differs };
}

/**
 * Expects no more than `NOISE_PIXELS` pixels to have a channel that differs
 * by more than `BLEND_TOLERANCE`. On a failure, attaches both screenshots
 * and a mask of the pixels that differ.
 */
async function expectSamePixels(name: string, expected: PNG, actual: PNG) {
  const { count, differs } = findDifferences(expected, actual);
  if (count > NOISE_PIXELS) {
    const mask = new PNG({ width: expected.width, height: expected.height });
    for (let i = 0; i < mask.data.length; i += 4) {
      if (differs(i)) mask.data.set([255, 0, 0, 255], i);
    }
    for (const [suffix, image] of [
      ["expected", expected],
      ["actual", actual],
      ["mask", mask],
    ] as const) {
      await test.info().attach(`${name}-${suffix}.png`, {
        body: PNG.sync.write(image),
        contentType: "image/png",
      });
    }
  }
  expect(count, `pixels that differ: ${name}`).toBeLessThanOrEqual(
    NOISE_PIXELS,
  );
}

/**
 * The surface is one colour. Where nothing paints over the root background
 * (these pixels are magenta in `canary`), the colour that shows most often
 * must be the root background colour, exactly.
 */
async function expectSurfaceColor(page: Page, withSurface: PNG, canary: PNG) {
  const counts = new Map<string, number>();
  for (let i = 0; i < canary.data.length; i += 4) {
    if (!isMagenta(canary, i)) continue;
    const key = `rgb(${rgbAt(withSurface, i).join(", ")})`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [mostFrequent] = [...counts].sort((a, b) => b[1] - a[1]);
  expect(mostFrequent, "some bare root background").toBeDefined();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    mostFrequent[0],
  );
}

function setCanary(page: Page, on: boolean) {
  return page.evaluate(
    ([id, isOn, color]) => {
      document.getElementById(id)?.remove();
      if (!isOn) return;
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `html { background-color: rgb(${color}) !important; }`;
      document.head.append(style);
    },
    [CANARY_ID, on, MAGENTA.join(", ")] as const,
  );
}

function setSurfaceShown(page: Page, shown: boolean) {
  return page.evaluate(
    ([selector, isShown]) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector);
      if (!canvas) throw new Error("The GPU surface is not mounted");
      canvas.style.display = isShown ? "block" : "none";
    },
    [SURFACE, shown] as const,
  );
}

/** Resolves when the band has not changed for 400 ms, then two frames later. */
function bandAtRest(page: Page) {
  return page.evaluate(
    (selector) =>
      new Promise<void>((resolve) => {
        const canvas = document.querySelector(selector);
        if (!canvas) throw new Error("The GPU surface is not mounted");
        const finish = () => {
          observer.disconnect();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        };
        let timer = setTimeout(finish, 400);
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(finish, 400);
        });
        observer.observe(canvas, { attributes: true });
      }),
    SURFACE,
  );
}

async function expectReady(page: Page) {
  // The surface mounts after hydration, which is slow when SwiftShader runs
  // the WebGL of several tests at the same time.
  await expect(page.locator(SURFACE)).toHaveAttribute("data-state", "ready", {
    timeout: 15_000,
  });
  await bandAtRest(page);
}

/**
 * The page must look the same with the surface as without it, and the
 * surface must cover all of the root background that shows: a magenta root
 * background must not show anywhere.
 */
async function expectSurfaceMatchesPage(page: Page) {
  await expectReady(page);
  const withSurface = await screenshot(page);
  await setCanary(page, true);
  const canaryWithSurface = await screenshot(page);
  await setSurfaceShown(page, false);
  const canaryWithoutSurface = await screenshot(page);
  await setCanary(page, false);
  const withoutSurface = await screenshot(page);
  await setSurfaceShown(page, true);

  await expectSurfaceColor(page, withSurface, canaryWithoutSurface);
  await expectSamePixels("no surface", withoutSurface, withSurface);
  await expectSamePixels("canary", withSurface, canaryWithSurface);
  return { withoutSurface };
}

function bandTop(page: Page) {
  return page.locator(SURFACE).evaluate((canvas) => canvas.style.top);
}

async function scrollTo(page: Page, to: "middle" | "bottom") {
  await page.evaluate((where) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, where === "middle" ? Math.round(max / 2) : max);
  }, to);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const { name, use } of viewports) {
    test.describe(`${colorScheme}, ${name}`, () => {
      test.use({ ...use, colorScheme });

      test("should draw the page background at the top, middle and bottom", async ({
        page,
      }) => {
        await page.goto("/en/design-system");
        await expectSurfaceMatchesPage(page);
        const topAtStart = await bandTop(page);

        await scrollTo(page, "middle");
        await expect.poll(() => bandTop(page)).not.toBe(topAtStart);
        await expectSurfaceMatchesPage(page);

        await scrollTo(page, "bottom");
        await expectSurfaceMatchesPage(page);
      });

      test("should draw the page background after a theme switch", async ({
        page,
      }) => {
        await page.goto("/");
        await expectSurfaceMatchesPage(page);

        const background = await page
          .locator("html")
          .evaluate((html) => getComputedStyle(html).backgroundColor);
        await page
          .getByRole("button", { name: /switch to (light|dark) theme/i })
          .click();
        await expect(page.locator("html")).not.toHaveCSS(
          "background-color",
          background,
        );
        await expectSurfaceMatchesPage(page);
      });

      test("should draw the page background after a client navigation", async ({
        page,
      }) => {
        await page.goto("/en/design-system");
        await expectReady(page);
        await page
          .getByRole("main")
          .getByRole("link", { name: /^Colour/ })
          .click();
        await expect(page).toHaveURL(/\/design-system\/foundations\/color$/);
        await expect(
          page.getByRole("heading", { level: 1, name: "Colour" }),
        ).toBeVisible();
        await expectSurfaceMatchesPage(page);

        await scrollTo(page, "bottom");
        await expectSurfaceMatchesPage(page);
      });

      test("should show the DOM background while the context is lost", async ({
        page,
      }) => {
        await page.goto("/en/design-system");
        const { withoutSurface } = await expectSurfaceMatchesPage(page);

        const loseContext = await page.evaluateHandle((selector) => {
          const extension = document
            .querySelector<HTMLCanvasElement>(selector)
            ?.getContext("webgl2")
            ?.getExtension("WEBGL_lose_context");
          if (!extension) throw new Error("No WEBGL_lose_context");
          return extension;
        }, SURFACE);
        await loseContext.evaluate((extension) => {
          extension.loseContext();
        });
        await expect(page.locator(SURFACE)).toHaveAttribute(
          "data-state",
          "lost",
        );
        await expect(page.locator(SURFACE)).toBeHidden();
        await expectSamePixels("lost", withoutSurface, await screenshot(page));
        await setCanary(page, true);
        expect(hasMagenta(await screenshot(page))).toBe(true);
        await setCanary(page, false);

        await loseContext.evaluate((extension) => {
          extension.restoreContext();
        });
        await expectSurfaceMatchesPage(page);
      });
    });
  }
}

test.describe("resize", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("should draw the page background after a resize", async ({ page }) => {
    await page.goto("/en/design-system");
    await expectSurfaceMatchesPage(page);

    await page.setViewportSize({ width: 800, height: 600 });
    await expectSurfaceMatchesPage(page);

    await page.setViewportSize({ width: 1280, height: 1000 });
    await scrollTo(page, "bottom");
    await expectSurfaceMatchesPage(page);
  });
});

test("should keep the GPU surface out of the status bar", async ({ page }) => {
  await page.goto("/");
  await expectReady(page);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

  await scrollTo(page, "bottom");
  await expectReady(page);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
});

for (const { name, switchOff } of [
  {
    name: "the query parameter",
    switchOff: (page: Page) => page.goto("/?gpu=off"),
  },
  {
    name: "local storage",
    switchOff: async (page: Page) => {
      await page.addInitScript(() => {
        localStorage.setItem("gpu-surface", "off");
      });
      await page.goto("/");
    },
  },
]) {
  test(`should not mount the GPU surface when ${name} switches it off`, async ({
    page,
  }) => {
    await switchOff(page);
    // React runs the effects of the first render before it handles an
    // event. Thus when a click changes the theme, the surface is mounted if
    // it will be. A click before hydration does nothing, so try again.
    const html = page.locator("html");
    await expect(async () => {
      const background = await html.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      if (background === "rgb(0, 0, 0)") return;
      await page.getByRole("button", { name: /switch to dark theme/i }).click();
      await expect(html).toHaveCSS("background-color", "rgb(0, 0, 0)", {
        timeout: 1000,
      });
    }).toPass();
    await expect(page.locator("body > canvas")).toHaveCount(0);
  });
}
