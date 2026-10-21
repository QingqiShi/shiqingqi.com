import { expect, type Page } from "@playwright/test";
import { measureSpacing } from "./measure-spacing.ts";

/**
 * Runs `measureSpacing` under `root` and fails softly on each kind of failure.
 * `textGaps` also fails on a gap between two lines of text in one item. Only
 * the screens that follow that rule turn it on.
 */
export async function expectSpacing(
  page: Page,
  root: string[],
  { textGaps = false }: { textGaps?: boolean } = {},
) {
  await page.evaluate(() => document.fonts.ready);
  const report = await page.evaluate(measureSpacing, root);
  expect
    .soft(
      report.headings,
      "Each h2 and h3 has at least twice the space above it as below it",
    )
    .toEqual([]);
  expect.soft(report.stacks, "No two blocks in a stack touch").toEqual([]);
  expect
    .soft(report.empties, "No empty box in a stack takes a gap")
    .toEqual([]);
  if (textGaps) {
    expect
      .soft(report.texts, "Lines of text in one item take no gap")
      .toEqual([]);
  }
}
