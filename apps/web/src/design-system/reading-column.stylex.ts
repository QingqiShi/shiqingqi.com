import * as stylex from "@stylexjs/stylex";

/**
 * The centred column every doc page sets its title, headings and paragraphs
 * on. Not the Measure: the Measure caps a paragraph, the reading column
 * places it.
 */
export const readingColumn = stylex.defineConsts({ inlineSize: "48rem" });

/**
 * The inline size of the doc page, which a breakout Showcase spans. The
 * reading column measures the page and gives the length to all its content.
 */
export const docPageVars = stylex.defineVars({
  inlineSize: stylex.types.length("0px"),
});

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
