import * as stylex from "@stylexjs/stylex";
import { color, font } from "../tokens.stylex.ts";

/**
 * Document defaults: `root.html` goes on `<html>` and `root.body` on `<body>`.
 *
 * `root.html` turns on both colour schemes, which every `light-dark()` colour
 * token follows, paints the canvas, and stops mobile browsers from inflating
 * text. It sets no font size, so the visitor's browser font size reaches every
 * `rem` token. `root.body` sets the text that everything inherits: colour,
 * typeface, a reading leading, `text-wrap: pretty`, which keeps a lone word
 * off the last line of a paragraph, and `overflow-wrap: break-word`, which
 * breaks a word too long for its line, such as a URL, instead of letting it
 * overflow. `break-word` does not change the min-content size, so a flex or
 * grid item still keeps its longest word as its minimum; that item needs
 * `overflow-wrap: anywhere` or a zero minimum size.
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
    overflowWrap: "break-word",
  },
});
