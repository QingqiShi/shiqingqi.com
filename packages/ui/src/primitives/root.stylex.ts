import * as stylex from "@stylexjs/stylex";
import { color, font } from "../tokens.stylex.ts";

/**
 * Document defaults: `root.html` goes on `<html>` and `root.body` on `<body>`.
 *
 * `root.html` turns on both colour schemes, which every `light-dark()` colour
 * token follows, paints the canvas, and stops mobile browsers from inflating
 * text. It sets no font size, so the visitor's browser font size reaches every
 * `rem` token. `root.body` sets the text that everything inherits: colour,
 * typeface, a reading leading, and `text-wrap: pretty`, which keeps a lone
 * word off the last line of a paragraph.
 */
export const root = stylex.create({
  html: {
    colorScheme: "light dark",
    backgroundColor: color.bgCanvas,
    textSizeAdjust: "100%",
  },
  body: {
    color: color.fg,
    fontFamily: font.family,
    lineHeight: font.lineHeight_4,
    textWrap: "pretty",
  },
});
