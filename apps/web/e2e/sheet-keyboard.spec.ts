import { expect, test, type Page } from "@playwright/test";
import {
  pickSheetVariant,
  SHEET_LAB,
  sheetTrigger,
  waitForSheetToSettle,
} from "./helpers/sheet-lab.ts";

const SHEET = '[role="dialog"][aria-modal="true"]';

interface Keyboard {
  /** The height of the visual viewport above the keyboard. */
  readonly height: number;
  /** How far the visual viewport is below the top of the layout viewport. */
  readonly offset: number;
}

declare global {
  interface Window {
    setKeyboard?: (keyboard: Keyboard) => void;
  }
}

/**
 * Chromium has no on-screen keyboard, so this stands a visual viewport in for
 * the real one, the way iOS reports it while its keyboard is open.
 */
async function fakeVisualViewport(page: Page) {
  await page.addInitScript(() => {
    const real = window.visualViewport;
    if (!real) return;
    let keyboard: Keyboard | null = null;
    const fake = new EventTarget();
    Object.defineProperties(fake, {
      width: { get: () => real.width },
      height: { get: () => keyboard?.height ?? real.height },
      offsetLeft: { get: () => 0 },
      offsetTop: { get: () => keyboard?.offset ?? real.offsetTop },
      pageLeft: { get: () => real.pageLeft },
      pageTop: {
        get: () => (keyboard ? window.scrollY + keyboard.offset : real.pageTop),
      },
      scale: { get: () => 1 },
    });
    Object.defineProperty(window, "visualViewport", { value: fake });
    window.setKeyboard = (next) => {
      keyboard = next;
      fake.dispatchEvent(new Event("resize"));
    };
  });
}

async function openFormSheet(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Add a note" });
  await expect(async () => {
    await sheetTrigger(page).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await waitForSheetToSettle(page);
}

function readCard(page: Page) {
  return page.evaluate((selector) => {
    const card = document.querySelector(selector);
    if (!card) throw new Error("No sheet");
    const { top, bottom } = card.getBoundingClientRect();
    const scroller = [...card.querySelectorAll("*")].find(
      (element) => getComputedStyle(element).overflowY === "auto",
    );
    return {
      top,
      bottom,
      edge: document.documentElement.clientHeight,
      dimBottom: [...document.body.children]
        .find(
          (child) =>
            child.getAttribute("aria-hidden") === "true" &&
            child.childElementCount === 0 &&
            getComputedStyle(child).backgroundColor.startsWith("rgba(0, 0, 0,"),
        )
        ?.getBoundingClientRect().bottom,
      canScroll: scroller
        ? scroller.scrollHeight > scroller.clientHeight
        : false,
    };
  }, SHEET);
}

test.describe("a Sheet over an on-screen keyboard", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await fakeVisualViewport(page);
    await page.goto(SHEET_LAB);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await pickSheetVariant(page, "Form");
  });

  test("should fit the card above the keyboard and scroll its content", async ({
    page,
  }) => {
    await openFormSheet(page);
    const rest = await readCard(page);
    const gap = rest.edge - rest.bottom;

    await page.evaluate(() => window.setKeyboard?.({ height: 420, offset: 0 }));
    await expect
      .poll(async () => (await readCard(page)).bottom)
      .toBeCloseTo(420 - gap, 0);
    const card = await readCard(page);
    expect(card.top).toBeGreaterThanOrEqual(0);
    expect(card.canScroll).toBe(true);
  });

  test("should follow the visual viewport past the end of the document, over the dimmed page", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await openFormSheet(page);
    const rest = await readCard(page);
    const gap = rest.edge - rest.bottom;

    // iOS scrolls the visual viewport past the end of the document, where
    // the layout viewport stops, so the visible area goes on below the
    // bottom of the layout viewport.
    const keyboard = { height: 426, offset: 480 };
    await page.evaluate((next) => window.setKeyboard?.(next), keyboard);
    const bottom = keyboard.offset + keyboard.height - gap;
    await expect
      .poll(async () => (await readCard(page)).bottom)
      .toBeCloseTo(bottom, 0);
    const card = await readCard(page);
    expect(card.top).toBeGreaterThanOrEqual(keyboard.offset);
    expect(card.dimBottom).toBeGreaterThanOrEqual(
      keyboard.offset + keyboard.height,
    );
  });
});
