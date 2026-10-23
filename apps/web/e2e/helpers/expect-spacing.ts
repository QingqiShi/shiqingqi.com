import { expect, type Page } from "@playwright/test";
import { selectedSelector } from "@tuja/ui/primitives/selected-selector";
import { measureSpacing } from "./measure-spacing.ts";

/**
 * Runs `measureSpacing` under `root` and fails softly on each kind of failure.
 */
export async function expectSpacing(page: Page, root: string[]) {
  await page.evaluate(() => document.fonts.ready);
  const report = await page.evaluate(measureSpacing, {
    roots: root,
    selected: selectedSelector,
  });
  expect
    .soft(
      report.headings,
      "Each h2, h3 and group label has at least twice the space above it as below it",
    )
    .toEqual([]);
  expect.soft(report.stacks, "No two blocks in a stack touch").toEqual([]);
  expect
    .soft(report.empties, "No empty box in a stack takes a gap")
    .toEqual([]);
  expect
    .soft(
      report.texts,
      "Lines of text in one item take no gap, and a heading at h2 size or larger takes rhythm.tight",
    )
    .toEqual([]);
  expect
    .soft(report.paddedRows, "Rows that pad themselves take no gap")
    .toEqual([]);
}
