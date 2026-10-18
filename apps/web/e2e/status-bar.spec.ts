import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  pickSheetVariant,
  SHEET_LAB,
  sheetTrigger,
} from "./helpers/sheet-lab.ts";
import { findStatusBarCandidates } from "./helpers/status-bar.ts";

test("should flag a viewport-sized fixed canvas element", async ({ page }) => {
  await page.setContent(`
    <body style="margin: 0">
      <canvas style="position: fixed; inset: 0; width: 100vw; height: 100vh"></canvas>
    </body>
  `);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual(["canvas"]);
});

for (const { name, path } of [
  { name: "home page", path: "/" },
  {
    name: "design-system page",
    path: "/en/design-system/components/sticky-controls",
  },
]) {
  test(`should keep every fixed box on the ${name} out of the status bar`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);

    // Safari on iOS keeps sampling the top edge after a scroll.
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
  });
}

test("should keep an open Sheet and its dim out of the status bar", async ({
  page,
}) => {
  await page.goto("/en/design-system/components/sheet");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  const open = page.getByRole("button", { name: "Open a tall sheet" });
  const dialog = page.getByRole("dialog", { name: "Release notes" });
  await expect(async () => {
    await open.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
  expect(
    await page.evaluate(findStatusBarCandidates, '[role="dialog"]'),
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
});

test.describe("an open Sheet on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  const SHEET = '[role="dialog"][aria-modal="true"]';

  async function openSheet(
    page: Page,
    {
      settle = true,
      open = sheetTrigger(page),
    }: { settle?: boolean; open?: Locator } = {},
  ) {
    // The sheet gives the focus back to the trigger when it closes, which
    // scrolls the trigger into view. So the trigger is in view first, as it
    // is when a visitor taps it, and Enter opens the sheet without the
    // scroll that a click can add.
    // Enter on the sheet's close button closes the sheet, so a retry presses
    // Enter only while no sheet is there.
    await expect(async () => {
      if ((await page.locator(SHEET).count()) === 0) {
        await open.evaluate((button) => {
          button.scrollIntoView({ block: "nearest" });
          button.focus({ preventScroll: true });
        });
        await page.keyboard.press("Enter");
      }
      await expect(page.locator(SHEET)).toHaveCount(1, { timeout: 1000 });
    }).toPass();
    if (!settle) return;
    await expect(page.locator(SHEET)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBe(0);
  }

  /**
   * Holds every running animation at `time` ms and reads where the card is
   * against the bottom of the screen.
   */
  function readCardAt(page: Page, time: number) {
    return page.evaluate(
      ({ selector, at }) => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = at;
        }
        const card = document.querySelector(selector);
        if (!card) throw new Error("No sheet");
        const { top, bottom } = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        return {
          top,
          bottom,
          edge: window.innerHeight,
          opacity: Number(style.opacity),
          mask: style.maskImage,
        };
      },
      { selector: SHEET, at: time },
    );
  }

  /**
   * What the page itself puts under a sample point before the sheet opens.
   * The Lab's bar is fixed across the bottom of a phone screen, so the Lab
   * page has candidates of its own, and the sheet must add none to them.
   */
  const candidatesBefore = new WeakMap<Page, string[]>();

  async function expectNoCandidates(page: Page) {
    const before = [...(candidatesBefore.get(page) ?? [])];
    for (const candidate of await page.evaluate(findStatusBarCandidates)) {
      const index = before.indexOf(candidate);
      expect(index, `a new candidate: ${candidate}`).not.toBe(-1);
      before.splice(index, 1);
    }
    expect(await page.evaluate(findStatusBarCandidates, SHEET)).toEqual([]);
  }

  async function openPage(page: Page, path: string) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async function openFormSheet(page: Page, options?: { settle?: boolean }) {
    await openPage(page, SHEET_LAB);
    await pickSheetVariant(page, "Form");
    candidatesBefore.set(page, await page.evaluate(findStatusBarCandidates));
    await openSheet(page, options);
  }

  test("should keep every box of the sheet out of both sample points", async ({
    page,
  }) => {
    await openFormSheet(page);
    await expectNoCandidates(page);
  });

  test("should slide the card up from below the bottom of the screen", async ({
    page,
  }) => {
    await openFormSheet(page, { settle: false });

    const start = await readCardAt(page, 0);
    expect(start.top).toBeGreaterThanOrEqual(start.edge - 1);
    expect(start.opacity).toBe(1);
    await expectNoCandidates(page);

    const early = await readCardAt(page, 60);
    expect(early.top).toBeLessThan(early.edge);
    expect(early.bottom).toBeGreaterThan(early.edge);
    expect(early.opacity).toBe(1);
    await expectNoCandidates(page);

    for (const time of [150, 300, 500]) {
      await readCardAt(page, time);
      await expectNoCandidates(page);
    }
  });

  test("should slide the card down off the screen as it leaves", async ({
    page,
  }) => {
    await openFormSheet(page);
    await page.keyboard.press("Escape");

    const middle = await readCardAt(page, 60);
    expect(middle.bottom).toBeGreaterThan(middle.edge);
    expect(middle.opacity).toBe(1);
    await expectNoCandidates(page);

    const end = await readCardAt(page, 299);
    expect(end.top).toBeGreaterThanOrEqual(end.edge - 1);
    await expectNoCandidates(page);
  });

  test("should keep the card opaque under the pointer while a drag takes it past the bottom of the screen", async ({
    page,
  }) => {
    await openFormSheet(page);
    const box = await page.locator(SHEET).boundingBox();
    if (!box) throw new Error("The sheet has no box");
    const x = box.x + box.width / 2;
    const y = box.y + 8;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 300, { steps: 10 });

    const past = await readCardAt(page, 0);
    expect(past.top).toBeCloseTo(box.y + 300, 0);
    expect(past.bottom).toBeGreaterThan(past.edge);
    expect(past.opacity).toBe(1);
    expect(past.mask).toBe("none");
    await expectNoCandidates(page);
    await page.mouse.up();
  });

  for (const { name, scrollTo } of [
    { name: "the middle", scrollTo: "trigger" },
    { name: "the end", scrollTo: "end" },
  ] as const) {
    test(`should dim the page from its top to a screen below its end, opened at ${name} of the page, and leave the page where it was`, async ({
      page,
    }) => {
      await openPage(page, "/en/design-system/components/sheet");
      const open = page.getByRole("button", { name: "Open a short sheet" });
      // A late font or image moves the page under a scroll position, so the
      // page settles before the test scrolls it.
      await page.evaluate(() => document.fonts.ready);
      let height = 0;
      await expect
        .poll(async () => {
          const last = height;
          height = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          return height === last;
        })
        .toBe(true);
      if (scrollTo === "trigger") {
        await open.evaluate((button) => {
          button.scrollIntoView({ block: "center" });
        });
      } else {
        await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
        });
      }
      const before = await page.evaluate(() => window.scrollY);
      expect(before).toBeGreaterThan(0);
      if (scrollTo === "trigger") {
        await openSheet(page, { open });
      } else {
        // The trigger is far above the end of the page. A click from code
        // does not focus it, so the sheet gives the focus back to the body,
        // and that does not scroll the page.
        await open.evaluate((button) => {
          if (button instanceof HTMLElement) button.click();
        });
        await expect(page.locator(SHEET)).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => document.getAnimations().length))
          .toBe(0);
      }

      const dim = await page.evaluate(() => {
        const element = [...document.body.children].find(
          (child): child is HTMLElement =>
            child instanceof HTMLElement &&
            child.getAttribute("aria-hidden") === "true" &&
            child.childElementCount === 0 &&
            getComputedStyle(child).backgroundColor.startsWith("rgba(0, 0, 0,"),
        );
        if (!element) throw new Error("No dim");
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;height:100lvh;width:0";
        document.body.append(probe);
        const lvh = probe.getBoundingClientRect().height;
        probe.remove();
        const { top, bottom } = element.getBoundingClientRect();
        return {
          top: top + window.scrollY,
          belowLayoutViewport: bottom - document.documentElement.clientHeight,
          lvh,
          shadow: getComputedStyle(element).boxShadow,
        };
      });
      expect(dim.top).toBe(0);
      expect(dim.belowLayoutViewport).toBeGreaterThanOrEqual(dim.lvh);
      expect(dim.shadow).toBe("none");
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      await expectNoCandidates(page);

      await page.mouse.click(195, 120);
      await expect(page.locator(SHEET)).toHaveCount(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
      expect(await page.evaluate(findStatusBarCandidates)).toEqual([]);
    });
  }
});
