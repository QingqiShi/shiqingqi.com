import type { Locator, Page } from "@playwright/test";
import { expect, expectNoSidewaysScroll, test } from "./finance-test.ts";
import { DESKTOP, MOBILE } from "./transactions-page.ts";

async function openNetWorth(page: Page, locale: "en" | "zh" = "en") {
  await page.goto(locale === "zh" ? "/zh/finance" : "/finance");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: locale === "zh" ? "净资产" : "Net worth",
    }),
  ).toBeVisible();
  // The skeleton shows the same heading. Only the loaded screen has this region.
  await expect(
    page.getByRole("region", {
      name: locale === "zh" ? "今日净资产" : "Net worth today",
    }),
  ).toBeVisible();
}

async function openReorder(page: Page) {
  const reorder = page.getByRole("link", { name: "Reorder" });
  await reorder.scrollIntoViewIfNeeded();
  await reorder.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Reorder accounts" }),
  ).toBeVisible();
}

/** The names on the reorder handles, top to bottom: each Group, then its accounts. */
function handleNames(page: Page) {
  return page
    .getByRole("button", { name: /^Move / })
    .evaluateAll((handles) =>
      handles.map((handle) =>
        (handle.getAttribute("aria-label") ?? "").replace(/^Move /, ""),
      ),
    );
}

function groupNames(page: Page) {
  return page
    .locator("main section[id^='group-']")
    .evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("aria-label")),
    );
}

/** Rainy Day Savings dragged above Alex Current, in the seeded Cash Group. */
const SAVINGS_FIRST = ["Rainy Day Savings", "Alex Current", "Sam Current"];

/** The points of a drag down or up to just before `to`, so that the row takes the place of `to`. */
function dragPath(from: number, to: number, steps = 15) {
  return Array.from(
    { length: steps },
    (_, step) => from + ((to - 10 - from) * (step + 1)) / steps,
  );
}

async function centreOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("The element has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("Net worth at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("the headline shows today's net worth with its changes, and the trend chart fills the pane", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const headline = page.getByRole("region", { name: "Net worth today" });
    await expect(headline).toContainText(/£[\d,]+/);
    await expect(headline).not.toContainText(/£[\d,]+\.\d/);
    await expect(headline.getByText("1W", { exact: true })).toBeVisible();
    await expect(headline.getByText("YTD", { exact: true })).toBeVisible();
    await expect(headline.getByText("Assets")).toBeVisible();
    await expect(headline.getByText("Liabilities")).toBeVisible();

    const pane = page.getByRole("complementary", { name: "Account" });
    await expect(
      pane.getByRole("group", { name: /^Net worth\. Use the arrow keys/ }),
    ).toBeVisible();
    const paneBox = await pane.boundingBox();
    expect(paneBox?.height).toBeGreaterThan(DESKTOP.height * 0.9);
    const yearChip = pane.getByRole("radio", { name: "1Y" });
    await yearChip.click();
    await expect(yearChip).toBeChecked();
  });

  test("an account opens beside the list with its ledger and balances after each line", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Alex Current/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);
    const pane = page.getByRole("complementary", { name: "Account" });
    await expect(
      pane.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Alex Current/ }),
    ).toHaveAttribute("aria-current", "true");
    const ledger = pane.getByRole("region", { name: "Ledger" });
    await expect(ledger.getByText("Balance after:").first()).toBeAttached();
    await expect(
      ledger.getByRole("link", { name: "All transactions on this account" }),
    ).toBeVisible();
  });

  test("the trend moves to the list while an account is open, and Close brings it back to the pane", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const pane = page.getByRole("complementary", { name: "Account" });
    const trend = page.getByRole("region", { name: "Trend" });
    await expect(pane.getByRole("region", { name: "Trend" })).toBeVisible();

    await page.getByRole("link", { name: /^Alex Current/ }).click();
    await expect(
      pane.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    await expect(trend).toHaveCount(1);
    await expect(pane.getByRole("region", { name: "Trend" })).toHaveCount(0);
    const trendBox = await trend.boundingBox();
    const rowBox = await page
      .getByRole("link", { name: /^Alex Current/ })
      .boundingBox();
    expect(trendBox?.y).toBeLessThan(rowBox?.y ?? 0);

    await pane.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/[?&]account=/);
    await expect(pane.getByRole("region", { name: "Trend" })).toBeVisible();
    await expect(trend).toHaveCount(1);
  });
});

test.describe("Reorder at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("an account drags inside its Group, a Group moves by keyboard past Groups of the other side, and the order stays", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    expect((await groupNames(page)).slice(0, 2)).toEqual(["流动资产", "投资"]);
    await openReorder(page);

    const from = await centreOf(page.getByText("Rainy Day Savings"));
    const to = await centreOf(page.getByText("Alex Current"));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (const y of dragPath(from.y, to.y)) {
      await page.mouse.move(from.x, y);
    }
    await page.mouse.up();
    await expect
      .poll(async () => (await handleNames(page)).slice(0, 4))
      .toEqual(["流动资产", ...SAVINGS_FIRST]);

    const names = await handleNames(page);
    const groups = [
      "投资",
      "退休资产",
      "不动产",
      "其他资产",
      "不动产负债",
      "信用",
    ].filter((name) => names.includes(name));
    const passed = groups.slice(0, groups.indexOf("信用")).reverse();
    const credit = page.getByRole("button", { name: "Move 信用" });
    await credit.focus();
    await page.keyboard.press("Space");
    await expect(credit).toHaveAttribute("aria-pressed", "true");
    for (const name of passed) {
      await page.keyboard.press("ArrowUp");
      await expect(
        page.getByRole("status").filter({ hasText: /^Moved to the place of/ }),
      ).toHaveText(`Moved to the place of ${name}`);
    }
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await handleNames(page)).indexOf("信用"))
      .toBe(4);

    await page.getByRole("link", { name: "Done" }).click();
    await expect(page).not.toHaveURL(/mode=/);
    await page.reload();
    await expect
      .poll(async () => (await groupNames(page)).slice(0, 3))
      .toEqual(["流动资产", "信用", "投资"]);
    await openReorder(page);
    expect((await handleNames(page)).slice(1, 4)).toEqual(SAVINGS_FIRST);
  });
});

test.describe("Reorder on a 390 px touch screen", () => {
  test.use({ viewport: MOBILE, hasTouch: true });

  test("a finger on the handle drags an account, and a swipe on a row scrolls", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await openReorder(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = (
      type: "touchStart" | "touchMove" | "touchEnd",
      x = 0,
      y = 0,
    ) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });

    const from = await centreOf(
      page.getByRole("button", { name: "Move Rainy Day Savings" }),
    );
    const to = await centreOf(
      page.getByRole("button", { name: "Move Alex Current" }),
    );
    await touch("touchStart", from.x, from.y);
    for (const y of dragPath(from.y, to.y)) {
      await touch("touchMove", from.x, y);
    }
    await touch("touchEnd");
    await expect
      .poll(async () => (await handleNames(page)).slice(1, 4))
      .toEqual(SAVINGS_FIRST);

    const scrolled = await page.evaluate(() => window.scrollY);
    const row = await centreOf(page.getByText("Sam Current"));
    for (const [index, y] of [row.y, row.y - 100, row.y - 200].entries()) {
      await touch(index === 0 ? "touchStart" : "touchMove", row.x, y);
    }
    await touch("touchEnd");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrolled);
    expect((await handleNames(page)).slice(1, 4)).toEqual(SAVINGS_FIRST);
  });
});

test.describe("Net worth at 390 px", () => {
  test.use({ viewport: MOBILE });

  test("in Chinese the headline, range chips and chart fit the screen", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page, "zh");
    const headline = page.getByRole("region", { name: "今日净资产" });
    await expect(headline.getByText("近一周")).toBeVisible();
    await expect(headline.getByText("今年", { exact: true })).toBeVisible();
    const ranges = page.getByRole("radiogroup", { name: "时间范围" });
    await expect(ranges.getByRole("radio", { name: "6M" })).toBeChecked();
    await expect(ranges.getByRole("radio")).toHaveText([
      "1W",
      "1M",
      "3M",
      "6M",
      "YTD",
      "1Y",
      "5Y",
      "全部",
    ]);
    await expectNoSidewaysScroll(page);
  });

  test("picking a day or a range on the trend chart does not move the chart", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page, "zh");
    const plot = page.getByRole("group", { name: /^净资产。/ });
    const readout = page.locator(
      `[id="${String(await plot.getAttribute("aria-describedby"))}"]`,
    );
    await expect(readout).toContainText("平均");
    const restTop = (await plot.boundingBox())?.y;
    await plot.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(readout).not.toContainText("平均", { useInnerText: true });
    expect((await plot.boundingBox())?.y).toBe(restTop);
    await page.keyboard.down("Shift");
    for (let step = 0; step < 40; step++)
      await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");
    await expect(readout).toContainText(" – ", { useInnerText: true });
    expect((await plot.boundingBox())?.y).toBe(restTop);
  });

  test("an account opens on its own page and leads back to Net worth", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Family Home/ }).click();
    await expect(page).toHaveURL(/\/finance\/accounts\/[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Family Home" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await page.getByRole("link", { name: "Net worth" }).first().click();
    await expect(page).toHaveURL(/\/finance$/, { timeout: 30_000 });
  });
});
