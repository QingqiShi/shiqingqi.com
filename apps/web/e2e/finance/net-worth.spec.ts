import type { Locator, Page } from "@playwright/test";
import { readScrollY, wheelPage } from "../helpers/scroll.ts";
import { expect, expectNoSidewaysScroll, test } from "./finance-test.ts";
import { DESKTOP, MOBILE, SYNC_TIMEOUT } from "./transactions-page.ts";

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
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

/** The URLs of the screen data that the router fetches for a navigation from now on, without its prefetches. */
function watchScreenRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => {
    const headers = request.headers();
    if (headers.rsc === "1" && !("next-router-prefetch" in headers)) {
      urls.push(request.url());
    }
  });
  return urls;
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

  test("the headline shows today's net worth with its changes, and the Household shows its trend in a card", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const headline = page.getByRole("region", { name: "Net worth today" });
    await expect(headline).toContainText(/£[\d,]+/);
    await expect(headline).not.toContainText(/£[\d,]+\.\d/);
    await expect(headline.getByText("1W", { exact: true })).toBeVisible();
    await expect(headline.getByText("YTD", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Net worth today/ }),
    ).toHaveAttribute("aria-current", "page");

    const household = page.getByRole("region", { name: "Household" });
    const trend = household.getByRole("region", { name: "Trend" });
    await expect(
      trend.getByRole("group", { name: /^Net worth\. Use the arrow keys/ }),
    ).toBeVisible();
    const trendHeight = (await trend.boundingBox())?.height ?? 0;
    expect(trendHeight).toBeGreaterThan(DESKTOP.height * 0.25);
    expect(trendHeight).toBeLessThan(DESKTOP.height * 0.6);
    const yearChip = trend.getByRole("radio", { name: "1Y" });
    await yearChip.click();
    await expect(yearChip).toBeChecked();
  });

  test("the Household lists what moved this week and what needs a look, each leading on", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const household = page.getByRole("region", { name: "Household" });
    const moved = household.getByRole("region", {
      name: "What moved this week",
    });
    const movers = moved.getByRole("link");
    await expect(movers.first()).toBeVisible();
    const changes = await movers.evaluateAll((links) =>
      links.map((link) =>
        Math.abs(
          Number(
            (/[+-]£[\d,]+/.exec(link.textContent) ?? ["0"])[0].replace(
              /[£,+]/g,
              "",
            ),
          ),
        ),
      ),
    );
    expect(changes.length).toBeLessThanOrEqual(5);
    expect(changes).toEqual(changes.toSorted((a, b) => b - a));

    const needsALook = household.getByRole("region", { name: "Needs a look" });
    await expect(
      needsALook.getByRole("link", { name: /transactions? to review$/ }),
    ).toHaveAttribute("href", /\/finance\/transactions\?review=1$/);

    const first = movers.first();
    const name = (await first.locator("span").first().textContent()) ?? "";
    await first.click();
    await expect(page).toHaveURL(/[?&]account=/);
    await expect(
      page.getByRole("heading", { level: 2, name: name.trim() }),
    ).toBeVisible();
  });

  test("while an account is open, the sidebar shows the trend under the headline, and a pick on it shows in the headline", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const headline = page.getByRole("region", { name: "Net worth today" });
    const today = await headline.textContent();
    const sidebar = page.getByRole("link", { name: /Net worth today/ });
    await expect(sidebar).toBeVisible();
    await page.getByRole("link", { name: /^Alex Current Northbank/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);

    const trends = page.getByRole("group", {
      name: /^Net worth\. Use the arrow keys/,
    });
    await expect(trends).toHaveCount(1);
    const trend = trends.first();
    await expect(trend).toBeVisible();
    const headlineBox = await headline.boundingBox();
    const trendBox = await trend.boundingBox();
    expect(trendBox?.y).toBeGreaterThan(
      (headlineBox?.y ?? 0) + (headlineBox?.height ?? 0) - 1,
    );
    expect(trendBox?.x ?? Infinity).toBeLessThan(
      (headlineBox?.x ?? 0) + (headlineBox?.width ?? 0),
    );

    await trend.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(headline).not.toHaveText(today ?? "");
    await expect(page).toHaveURL(/[?&]account=/);
  });

  test("an account opens in the column after the list, a ledger entry opens in the column after it, and each closes back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Alex Current Northbank/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);
    const account = page.getByRole("region", { name: "Alex Current" });
    await expect(
      account.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Alex Current Northbank/ }),
    ).toHaveAttribute("aria-current", "true");
    const ledger = account.getByRole("region", { name: "Ledger" });
    await expect(ledger.getByText("Balance after:").first()).toBeAttached();
    await expect(
      ledger.getByRole("link", { name: "All transactions on this account" }),
    ).toBeVisible();

    const entry = ledger.locator("a[href*='tx=']").first();
    await entry.click();
    await expect(page).toHaveURL(/[?&]tx=/);
    const transaction = page.getByRole("region", { name: "Transaction" });
    await expect(transaction.getByRole("form")).toBeVisible();
    await expect(entry).toHaveAttribute("aria-current", "true");
    await expect(account).toBeVisible();

    await transaction.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/[?&]tx=/);
    await expect(page).toHaveURL(/[?&]account=/);
    await expect(transaction).toHaveCount(0);

    await page.getByRole("link", { name: /Net worth today/ }).click();
    await expect(page).not.toHaveURL(/[?&]account=/);
    await expect(
      page
        .getByRole("region", { name: "Household" })
        .getByRole("region", { name: "Trend" }),
    ).toBeVisible();
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
    // dnd-kit starts to listen for the arrow keys in a timer after the pick-up.
    // Chromium can send a key before that timer, and then the key is lost.
    // Timers run in order, so this timer runs after the timer of dnd-kit.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
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

    const scrollTop = () =>
      page.getByText("Sam Current").evaluate((element) => {
        let node = element.parentElement;
        while (
          node !== null &&
          !["auto", "scroll"].includes(getComputedStyle(node).overflowY)
        ) {
          node = node.parentElement;
        }
        return (node ?? document.scrollingElement)?.scrollTop ?? 0;
      });
    const scrolled = await scrollTop();
    const row = await centreOf(page.getByText("Sam Current"));
    for (const [index, y] of [row.y, row.y - 100, row.y - 200].entries()) {
      await touch(index === 0 ? "touchStart" : "touchMove", row.x, y);
    }
    await touch("touchEnd");
    await expect.poll(scrollTop).toBeGreaterThan(scrolled);
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

  test("an account covers Net worth, a ledger entry opens in a sheet over the account, and each leads back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const screenRequests = watchScreenRequests(page);
    const scrolled = await wheelPage(page, 300);
    await page.getByRole("link", { name: /^Alex Current Northbank/ }).click();
    await expect(page).toHaveURL(/\/finance\?account=[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    // The account starts at its top, and Net worth keeps its scroll under it.
    await expect.poll(() => readScrollY(page)).toBe(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.locator("a[href*='tx=']").first().click();
    await expect(page).toHaveURL(/[?&]tx=/, { timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "Transaction" });
    await expect(sheet.getByRole("form")).toBeVisible();
    await expectNoSidewaysScroll(page);
    await sheet.getByRole("button", { name: "Close" }).first().click();
    await expect(page).not.toHaveURL(/[?&]tx=/, { timeout: 30_000 });
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("heading", { name: "Ledger" })).toBeVisible();

    await page
      .getByRole("region", { name: "Alex Current" })
      .getByRole("link", { name: /^Net worth/ })
      .click();
    await expect(page).toHaveURL(/\/finance$/, { timeout: 30_000 });
    await expect.poll(() => readScrollY(page)).toBe(scrolled);
    // Each step only changes the query, and the screen draws it from the
    // Replica, so no step waits for the server.
    expect(screenRequests).toEqual([]);
  });

  test("Add opens a new expense over Net worth and over an account, on that account, and each close leads back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    const screenRequests = watchScreenRequests(page);
    const sheet = page.getByRole("dialog", { name: "New transaction" });

    await page.getByRole("link", { name: "Add", exact: true }).click();
    await expect(page).toHaveURL(/\/finance\?new=expense$/);
    await expect(
      sheet.getByRole("form", { name: "New expense" }),
    ).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).first().click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/finance$/);

    await page.getByRole("link", { name: /^Alex Current Northbank/ }).click();
    await expect(page).toHaveURL(/\/finance\?account=[0-9a-f-]+$/, {
      timeout: 30_000,
    });
    const accountUrl = page.url();
    const account = page.getByRole("region", { name: "Alex Current" });
    await expect(
      account.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    // The Household column keeps its own Add while it moves out.
    await account.getByRole("link", { name: "Add", exact: true }).click();
    await expect(page).toHaveURL(/[?&]new=expense/);
    await expect(sheet.getByRole("combobox", { name: "Account" })).toHaveValue(
      new URL(accountUrl).searchParams.get("account") ?? "",
    );
    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(accountUrl);
    await expect(
      page.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    expect(screenRequests).toEqual([]);
  });
});
