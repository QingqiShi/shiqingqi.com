import { expect, type Locator, type Page } from "@playwright/test";
import { waitForMotionToSettle } from "../helpers/motion.ts";

/** A push and a pull wait behind the seeding of other workers, because the e2e database serves one session at a time. */
export const SYNC_TIMEOUT = 20_000;

export const DESKTOP = { width: 1440, height: 900 };

/** The links of the Transactions list; each one opens its Transaction. */
export function transactionRows(page: Page): Locator {
  return page.locator("a[data-transaction-id]");
}

/** Rows that show every one of `texts`. */
export function rowsWith(page: Page, ...texts: (string | RegExp)[]): Locator {
  return texts.reduce(
    (rows, text) => rows.filter({ hasText: text }),
    transactionRows(page),
  );
}

export function toast(page: Page, text: string | RegExp): Locator {
  return page.getByRole("status").filter({ hasText: text });
}

/**
 * Signs out: from the signed-in Member at the bottom of the rail at `md` and
 * wider, and from the Settings menu page below `md`, where the page must be.
 */
export async function clickSignOut(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.getByRole("button", { name: /^Signed in as / }).click();
  }
  await page.getByRole("button", { name: "Sign out" }).click();
}

/** The sync status in the rail. Below `md` it is on the Settings menu page. */
export function syncStatus(page: Page, text: string | RegExp): Locator {
  return page.getByRole("status").filter({ hasText: text }).first();
}

/**
 * The Transactions URL for one day. The list is virtualised, so on a short
 * screen a new row of today can be out of the DOM below other rows. A list
 * of today alone keeps it in view.
 */
export function dayListPath(
  day: string,
  extra: Record<string, string> = {},
  locale: "en" | "zh" = "en",
) {
  const params = new URLSearchParams({ from: day, to: day, ...extra });
  return `${locale === "zh" ? "/zh" : ""}/finance/transactions?${params.toString()}`;
}

/** Opens a Transactions URL and waits until the Replica has the Household. */
export async function openTransactions(
  page: Page,
  path = "/finance/transactions",
) {
  await page.goto(path);
  await expect(
    page.getByRole("textbox", { name: /Quick add|快速记账/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: /Transactions by day|按日分组的交易/ })
      .or(
        page.getByText(
          /Nothing matches these filters\.|没有符合筛选条件的交易。/,
        ),
      ),
  ).toBeVisible();
}

/** The `+ Add` action: the header button at `lg` and wider, the floating link below. */
export async function openNewExpense(page: Page) {
  const wide = (page.viewportSize()?.width ?? 0) >= 1080;
  await (
    wide
      ? page.getByRole("button", { name: "Add", exact: true })
      : page.getByRole("link", { name: "Add", exact: true })
  ).click();
  const editor = page.getByRole("form", { name: "New expense" });
  await expect(editor).toBeVisible();
  await waitForMotionToSettle(page);
  return editor;
}

/** The value of the first option whose text contains `text`. */
export async function optionValue(select: Locator, text: string) {
  const value = await select
    .locator("option", { hasText: text })
    .first()
    .getAttribute("value");
  expect(value).not.toBeNull();
  return value ?? "";
}

/** Opens a Settings section and waits until the Replica has the Household. */
export async function openSettings(
  page: Page,
  section: string,
  heading: string,
) {
  await page.goto(`/finance/settings/${section}`);
  await expect(
    page.getByRole("heading", { level: 2, name: heading }),
  ).toBeVisible({ timeout: SYNC_TIMEOUT });
}

/** Adds a member named `name` on the Members settings, and returns the URL of a new invite link for them. */
export async function inviteMember(page: Page, name: string) {
  await openSettings(page, "members", "Members");
  await page.getByRole("button", { name: "Member", exact: true }).click();
  await page.getByRole("textbox", { name: /Name/ }).fill(name);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(toast(page, "Member added")).toBeVisible();
  await page
    .getByRole("button", { name: `Create invite link: ${name}` })
    .click();
  const link = page.getByRole("textbox", { name: "Link" });
  await expect(link).toHaveValue(/\/finance\/invite\//, {
    timeout: SYNC_TIMEOUT,
  });
  return link.inputValue();
}
