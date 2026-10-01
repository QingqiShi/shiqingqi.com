import * as stylex from "@stylexjs/stylex";

/**
 * The centred column every doc page sets its title, headings and paragraphs
 * on. Not the Measure: the Measure caps a paragraph, the reading column
 * places it.
 */
export const readingColumn = stylex.defineConsts({ inlineSize: "48rem" });

/**
 * Keeps a heading or a helper on the reading column inside a breakout. The
 * margin is zero when the parent is not wider than the column, so the style
 * is inert everywhere else.
 */
export const onReadingColumn = stylex.create({
  base: {
    marginInlineStart: `max(0px, calc((100% - ${readingColumn.inlineSize}) / 2))`,
  },
});
