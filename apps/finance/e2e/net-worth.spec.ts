import type { Page } from "@playwright/test";
import { expect, test } from "./finance-test.ts";
import { DESKTOP, SYNC_TIMEOUT } from "./transactions-page.ts";

async function openNetWorth(page: Page) {
  await page.goto("/");
  // The skeleton shows the same heading. Only the loaded screen has this region.
  await expect(
    page.getByRole("region", { name: "Net worth today" }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

/**
 * Waits for the first frame where a page of the content moves, stops the
 * motions of the view where that page is part way in, and tells whether the
 * page shows at its inline-start edge then.
 */
async function showsMovingPage(page: Page) {
  const shows = await page.waitForFunction(
    () => {
      // `data-moving` marks each box that a motion moves now.
      const moving = document.querySelector(
        '[data-split-view-column="content"] [data-moving]',
      );
      const view = moving?.closest("[data-split-view]");
      if (moving == null || view == null) return null;
      const motions = view
        .getAnimations({ subtree: true })
        .filter((motion) => motion.playState === "running");
      const column = view.getBoundingClientRect();
      const stopAt = (share: number) => {
        for (const motion of motions) {
          motion.pause();
          const end = motion.effect?.getComputedTiming().endTime;
          if (typeof end === "number" && Number.isFinite(end)) {
            motion.currentTime = end * share;
          }
        }
        return moving.getBoundingClientRect().left - column.left;
      };
      let share = 0.2;
      // The motion is a spring, so the share of its time is not the share of its way.
      while (share > 0.001 && stopAt(share) < column.width / 4) share /= 2;
      const { left, top, bottom } = moving.getBoundingClientRect();
      const isPartWay =
        left - column.left >= column.width / 4 && left < column.right - 16;
      const hit = document.elementFromPoint(
        left + 8,
        (top + Math.min(bottom, window.innerHeight)) / 2,
      );
      for (const motion of motions) motion.play();
      if (!isPartWay) return "not part way";
      return hit !== null && moving.contains(hit) ? "shows" : "covered";
    },
    null,
    { polling: "raf" },
  );
  return shows.jsonValue();
}

test.describe("Net worth at 1440 px", () => {
  test.use({ viewport: DESKTOP });

  test("an account opens in the column after the list, a ledger entry opens in the column after it, and each closes back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("link", { name: /^Alex Current £/ }).click();
    await expect(page).toHaveURL(/[?&]account=/);
    const account = page.getByRole("region", { name: "Alex Current" });
    await expect(
      account.getByRole("heading", { level: 2, name: "Alex Current" }),
    ).toBeVisible();
    const ledger = account.getByRole("region", { name: "Ledger" });

    const entry = ledger.locator("a[href*='tx=']").first();
    await entry.click();
    await expect(page).toHaveURL(/[?&]tx=/);
    const transaction = page.getByRole("region", { name: "Transaction" });
    await expect(transaction.getByRole("form")).toBeVisible();
    await expect(account).toBeVisible();

    await transaction.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/[?&]tx=/);
    await expect(page).toHaveURL(/[?&]account=/);
    await expect(transaction).toHaveCount(0);

    await page.getByRole("link", { name: /^Household / }).click();
    await expect(page).not.toHaveURL(/[?&]account=/);
    await expect(
      page
        .getByRole("region", { name: "Household" })
        .getByRole("region", { name: "Trend" }),
    ).toBeVisible();
  });

  // The collapsed sidebar took the list of accounts away, with no other way to it.
  test("with the sidebar collapsed, the household stays with a back link to the list of accounts, an account opens over the list, and its back link goes back", async ({
    page,
    session: _session,
  }) => {
    await openNetWorth(page);
    await page.getByRole("button", { name: "Sidebar" }).click();
    const household = page.getByRole("region", { name: "Household" });
    await expect(
      household.getByRole("region", { name: "Trend" }),
    ).toBeVisible();
    const list = page.getByRole("region", { name: "Net worth", exact: true });
    await expect(list).toBeHidden();

    await household.getByRole("link", { name: /^Net worth/ }).click();
    await expect(list).toBeVisible();

    await list.getByRole("link", { name: /Alex Current/ }).click();
    // The list covered the account while it came in.
    expect(await showsMovingPage(page)).toBe("shows");
    await expect(page).toHaveURL(/[?&]account=/);
    const account = page.getByRole("region", { name: "Alex Current" });
    await expect(account).toBeVisible();
    await expect(list).toBeHidden();

    await account.getByRole("link", { name: /^Net worth/ }).click();
    await expect(page).not.toHaveURL(/[?&]account=/);
    await expect(list).toBeVisible();
  });
});
