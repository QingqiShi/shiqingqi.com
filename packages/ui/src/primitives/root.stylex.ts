import * as stylex from "@stylexjs/stylex";
import { color, font, latinType } from "../tokens.stylex.ts";

/**
 * Document defaults: `root.html` goes on `<html>` and `root.body` on `<body>`.
 *
 * `root.html` turns on both colour schemes, which every `light-dark()` colour
 * token follows, paints the canvas, and stops mobile browsers from inflating
 * text. It sets no font size, so the visitor's browser font size reaches every
 * `rem` token. On a Chinese page it sets the `latinType` tokens back to plain
 * values. `root.body` sets the text that everything inherits: colour,
 * typeface, a reading leading and tracking, `text-wrap: pretty`, which keeps a
 * lone word off the last line of a paragraph, and `overflow-wrap: break-word`,
 * which breaks a word too long for its line, such as a URL, instead of letting
 * it overflow. `break-word` does not change the min-content size, so a flex or
 * grid item still keeps its longest word as its minimum; that item needs
 * `overflow-wrap: anywhere` or a zero minimum size.
 */
export const root = stylex.create({
  html: {
    colorScheme: "light dark",
    backgroundColor: color.bgCanvas,
    textSizeAdjust: "100%",
    [latinType.trackingBody]: { default: null, ":lang(zh)": "0" },
    [latinType.trackingHeading]: { default: null, ":lang(zh)": "0" },
    [latinType.trackingDisplay]: { default: null, ":lang(zh)": "0" },
    [latinType.lineHeightHeading]: { default: null, ":lang(zh)": 1.2 },
    [latinType.lineHeightDisplay]: { default: null, ":lang(zh)": 1.1 },
  },
  body: {
    color: color.fg,
    fontFamily: font.family,
    lineHeight: font.lineHeightBody,
    letterSpacing: latinType.trackingBody,
    textWrap: "pretty",
    overflowWrap: "break-word",
  },
});
