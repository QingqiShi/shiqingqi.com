import { expect, test, type Page } from "@playwright/test";
import { readScreenshotColumn } from "./helpers/read-screenshot-column.ts";
import { scrollToAndSettle, scrollWithin } from "./helpers/scroll.ts";
import { findStatusBarCandidates } from "./helpers/status-bar.ts";

// The design-system overview is more than four bands tall at this viewport.
const LONG_PAGE = "/en/design-system";
const DEBUG_PAGE = `${LONG_PAGE}?effects=debug`;
const EFFECT_PAGE = "/en/design-system/foundations/effect-layer?effects=debug";

declare global {
  interface Window {
    /** How many times the page asked for a WebGPU adapter. */
    adapterRequests?: number;
  }
}

test.use({ viewport: { width: 1280, height: 800 } });

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;

const scrollCanvases = (page: Page) =>
  page.locator('[data-effect-layer="scroll"]');

function scrollCanvasTransforms(page: Page) {
  return scrollCanvases(page).evaluateAll((canvases) =>
    canvases.map((canvas) =>
      canvas instanceof HTMLElement ? canvas.style.transform : null,
    ),
  );
}

async function bandHeightOf(page: Page) {
  await expect(scrollCanvases(page)).toHaveCount(2, { timeout: MOUNT_TIMEOUT });
  const height = await scrollCanvases(page)
    .first()
    .evaluate((canvas) =>
      canvas instanceof HTMLElement
        ? Number.parseFloat(canvas.style.height)
        : 0,
    );
  expect(height).toBeGreaterThan(0);
  return height;
}

/** Where the layout puts the page's headings and how far the page scrolls. */
function measureLayout(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    headings: [...document.querySelectorAll("h1, h2, h3")].map((heading) => {
      const rect = heading.getBoundingClientRect();
      return [rect.x, rect.y + window.scrollY, rect.width, rect.height];
    }),
  }));
}

test("mounts nothing and asks for no GPU device without an effect", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.adapterRequests = 0;
    const gpu = navigator.gpu;
    const requestAdapter = gpu.requestAdapter.bind(gpu);
    gpu.requestAdapter = (options) => {
      window.adapterRequests = (window.adapterRequests ?? 0) + 1;
      return requestAdapter(options);
    };
  });
  await page.goto(LONG_PAGE);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await expect(page.locator("[data-effect-layer]")).toHaveCount(0);
  expect(await page.evaluate(() => window.adapterRequests)).toBe(0);
});

test("mounts nothing without WebGPU", async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, "gpu");
  });
  await page.goto(DEBUG_PAGE);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await expect(page.locator("[data-effect-layer]")).toHaveCount(0);
});

test("leapfrogs the scroll canvas elements as the page scrolls", async ({
  page,
}) => {
  await page.goto(DEBUG_PAGE);
  const bandHeight = await bandHeightOf(page);
  const at = (band: number) => `translateY(${String(band * bandHeight)}px)`;

  // Each stop is 0.6 of a band past a band edge, so the drawn range, which is
  // one band tall, meets that band and the next one.
  for (const [y, expected] of [
    [0.6, [at(0), at(1)]],
    [1.6, [at(2), at(1)]],
    [2.6, [at(2), at(3)]],
    [0.6, [at(0), at(1)]],
  ] as const) {
    await scrollToAndSettle(page, Math.round(y * bandHeight));
    await expect.poll(() => scrollCanvasTransforms(page)).toEqual(expected);
  }
});

test("leaves the document's scroll size and layout as they are", async ({
  page,
}) => {
  await page.goto(LONG_PAGE);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const without = await measureLayout(page);

  await page.goto(DEBUG_PAGE);
  await expect(scrollCanvases(page)).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
  expect(await measureLayout(page)).toEqual(without);

  // At the end of the document the last band is clipped there.
  await scrollToAndSettle(page, without.scrollHeight - 800);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
    .toBe(without.scrollHeight);
});

test("keeps the fixed canvas element out of the status bar", async ({
  page,
}) => {
  await page.goto(DEBUG_PAGE);
  await expect(page.locator('[data-effect-layer="fixed"]')).toHaveCount(1, {
    timeout: MOUNT_TIMEOUT,
  });
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

  await scrollToAndSettle(page, 400);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
});

test("draws only the part of each band in the drawn range", async ({
  page,
}) => {
  await page.goto(DEBUG_PAGE);
  const bandHeight = await bandHeightOf(page);
  // The drawn range, [y - margin, y - margin + bandHeight), starts half a
  // band into band 2, so band 2 is drawn only in its lower half.
  const drawnTop = Math.round(2.5 * bandHeight);
  await scrollToAndSettle(page, Math.round(drawnTop + bandHeight / 12));
  await expect
    .poll(() => scrollCanvasTransforms(page))
    .toEqual([
      `translateY(${String(2 * bandHeight)}px)`,
      `translateY(${String(3 * bandHeight)}px)`,
    ]);

  // Stop the layer's frames, then scroll up into the part of band 2 that it
  // did not draw. The compositor moves the <canvas> elements as they are.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  const scrollY = Math.round(2.2 * bandHeight);
  await page.evaluate((top) => {
    window.scrollTo(0, top);
  }, scrollY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);

  // A column inside the strip the debug view draws down the band's left edge,
  // over page background and outside the sidebar.
  const column = await readScreenshotColumn(page, 4);
  const edge = drawnTop - scrollY;
  const background = column[8];
  expect(column.slice(8, edge - 4).every((pixel) => pixel === background)).toBe(
    true,
  );
  expect(
    column.slice(edge + 4, edge + 200).every((pixel) => pixel !== background),
  ).toBe(true);
});

test("lets pointers, hit tests and text selection through the canvas elements", async ({
  page,
}) => {
  await page.goto(EFFECT_PAGE);
  const pageCanvases = page.locator(
    '[data-effect-layer="scroll"], [data-effect-layer="fixed"]',
  );
  await expect(pageCanvases).toHaveCount(3, {
    timeout: MOUNT_TIMEOUT,
  });
  for (const wrapper of await pageCanvases.evaluateAll((canvases) =>
    canvases.map((canvas) => canvas.parentElement?.inert),
  )) {
    expect(wrapper).toBe(true);
  }

  const button = page.getByRole("button", { name: "Count presses" });
  const top = await button.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await scrollWithin(page, top - 400);
  const box = await button.boundingBox();
  if (box === null) {
    throw new Error("The button has no box.");
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  expect(
    await page.evaluate(
      ([pointX, pointY]) =>
        document.elementFromPoint(pointX, pointY)?.closest("button")
          ?.textContent,
      [x, y],
    ),
  ).toBe("Count presses");

  // The first press starts a ring, so the second one lands under an active
  // effect.
  await page.mouse.click(x, y);
  await page.mouse.click(x, y);
  await expect(button.locator("xpath=following-sibling::*[1]")).toHaveText("2");

  const helper = page.getByText("Pulse the accent tile on a beat");
  const helperBox = await helper.boundingBox();
  if (helperBox === null) {
    throw new Error("The label has no box.");
  }
  await page.mouse.dblclick(
    helperBox.x + 12,
    helperBox.y + helperBox.height / 2,
  );
  expect(
    await page.evaluate(() => window.getSelection()?.toString().trim()),
  ).toBe("Pulse");
});
