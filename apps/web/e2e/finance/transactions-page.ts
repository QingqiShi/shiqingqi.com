import { expect, type Locator, type Page } from "@playwright/test";

/** A push and a pull wait behind the seeding of other workers, because the e2e database serves one session at a time. */
export const SYNC_TIMEOUT = 20_000;

export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

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
