import { expect, test, type Page } from "@playwright/test";
import { waitForMotionToSettle } from "./helpers/motion.ts";

/**
 * The sidebar takes every space and edge from its structure, so the rules
 * hold in the rail and in the drawer alike. This spec checks how the spaces
 * and edges relate, never what they measure, so a new token value or a new
 * route keeps it green.
 */

type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right">;

interface Row {
  kind: "label" | "row";
  /** Whether the row is in a group in a group. */
  nested: boolean;
  box: Box;
  /** The box of the text, for the space a reader sees. */
  text: Box;
  /** Where the content starts: the icon, or else the text. */
  start: number;
}

function measure(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Design system"]');
    let scroller = nav?.parentElement;
    while (
      scroller &&
      !["auto", "scroll"].includes(getComputedStyle(scroller).overflowY)
    ) {
      scroller = scroller.parentElement;
    }
    if (!nav || !scroller) throw new Error("No scroller for the nav");
    scroller.scrollTo({ top: 0, behavior: "instant" });

    const box = (el: Element): Box => el.getBoundingClientRect();
    const textBox = (el: Element): Box => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      const first = walker.nextNode();
      if (!first) throw new Error("A row without text");
      range.selectNodeContents(first);
      return range.getBoundingClientRect();
    };

    const elements = [
      ...nav.querySelectorAll(
        "[role=group] > [id], li > a, li > button[aria-expanded]",
      ),
    ].filter((el) => el.checkVisibility());
    const rows = elements.map((el): Row => {
      const text = textBox(el);
      const icon = el.querySelector("svg");
      const first = el.firstElementChild?.contains(icon ?? null) ? icon : null;
      return {
        kind: el.matches("[role=group] > [id]") ? "label" : "row",
        nested: el.closest("li")?.parentElement?.closest("ul[id]") != null,
        box: box(el),
        text,
        start: first ? box(first).left : text.left,
      };
    });

    const header = [...scroller.querySelectorAll("a")].find(
      (a) =>
        !nav.contains(a) &&
        a.textContent === "Design system" &&
        a.checkVisibility(),
    );
    const tile = header?.firstElementChild;
    if (!tile) throw new Error("No header tile in the rail");
    const close = scroller.querySelector('[aria-label="Close menu"]');

    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "instant" });
    const home = scroller.querySelector('[aria-label="Home"]');
    if (!home?.checkVisibility()) throw new Error("No home link in the rail");

    return {
      rows,
      tile: box(tile),
      close: close?.checkVisibility() ? box(close) : null,
      home: box(home),
    };
  });
}

async function expectSidebarRules(page: Page) {
  const { rows, tile, close, home } = await measure(page);
  const expectEqual = (values: number[]) => {
    expect(values.length).toBeGreaterThan(1);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(0.5);
  };

  // A section label sits on its first row: its text is nearer the text of
  // that row than the text of the block above, and it does not overlap the
  // row.
  const labels = rows.flatMap((row, i) => (row.kind === "label" ? [i] : []));
  expect(labels.length).toBeGreaterThan(1);
  for (const i of labels.filter((i) => i > 0)) {
    const [above, label, below] = [rows[i - 1], rows[i], rows[i + 1]];
    expect(below.box.top - label.box.bottom).toBeGreaterThanOrEqual(-0.5);
    expect(below.text.top - label.text.bottom).toBeLessThan(
      label.text.top - above.text.bottom,
    );
  }

  // The rows of an open group in a group start past the content of the
  // group's row, and their fills start past its fill.
  const nested = rows.filter((row) => row.nested);
  expect(nested.length).toBeGreaterThan(0);
  for (const row of nested) {
    const parent = rows.findLast(
      (other) =>
        !other.nested && other.kind === "row" && other.box.top < row.box.top,
    );
    if (!parent) throw new Error("A nested row without a group row");
    expect(row.start).toBeGreaterThan(parent.start + 0.5);
    expect(row.box.left).toBeGreaterThan(parent.box.left + 0.5);
  }

  // The header tile, the section labels and the content of the rows start on
  // the text edge. The fills and the footer controls start on the box edge,
  // and the close button ends on it.
  const outer = rows.filter((row) => !row.nested);
  const outerRows = outer.filter((row) => row.kind === "row");
  expectEqual([...outer.map((row) => row.start), tile.left]);
  expectEqual([...outerRows.map((row) => row.box.left), home.left]);
  if (close) expectEqual([outerRows[0].box.right, close.right]);
}

const PATH = "/design-system/foundations/principles";

test("the design-system rail spaces its nav by structure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PATH);
  await expect(
    page.getByRole("navigation", { name: "Design system" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // The fixed footer of the rail takes its room in the nav after hydration.
  await expect(() => expectSidebarRules(page)).toPass({ timeout: 10_000 });
});

test("a category in the rail opens and closes, and the current one starts open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PATH);
  const nav = page.getByRole("navigation", { name: "Design system" });
  const basics = nav.getByRole("button", { name: "Basics" });
  const visual = nav.getByRole("button", { name: "Visual" });
  const current = nav.getByRole("link", { name: "Principles" });
  const colour = nav.getByRole("link", { name: "Colour" });

  await expect(basics).toHaveAttribute("aria-expanded", "true");
  await expect(current).toBeVisible();
  await expect(visual).toHaveAttribute("aria-expanded", "false");
  await expect(colour).toBeHidden();

  await visual.click();
  await expect(visual).toHaveAttribute("aria-expanded", "true");
  await expect(colour).toBeVisible();

  await basics.click();
  await expect(basics).toHaveAttribute("aria-expanded", "false");
  await expect(current).toBeHidden();
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("the design-system drawer spaces its nav by structure", async ({
    page,
  }) => {
    await page.goto(PATH);
    await page.getByRole("button", { name: "Design system menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Design system menu" }),
    ).toBeVisible();
    await waitForMotionToSettle(page);
    await page.evaluate(() => document.fonts.ready);
    await expectSidebarRules(page);
  });
});
