import * as stylex from "@stylexjs/stylex";
import { rhythm } from "../tokens.stylex.ts";

/**
 * A flex column that owns the space between its children at one `rhythm`
 * step. `text` has no gap: lines of text in one item, such as a heading and
 * its own text, are spaced by their line height alone.
 */
export const stack = stylex.create({
  text: { display: "flex", flexDirection: "column" },
  tight: { display: "flex", flexDirection: "column", gap: rhythm.tight },
  item: { display: "flex", flexDirection: "column", gap: rhythm.item },
  group: { display: "flex", flexDirection: "column", gap: rhythm.group },
  section: { display: "flex", flexDirection: "column", gap: rhythm.section },
});

export const cluster = stylex.create({
  inline: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.inline,
  },
  tight: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
  item: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.item,
  },
});

export const row = stylex.create({
  inline: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: rhythm.inline,
  },
  tight: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: rhythm.tight,
  },
  item: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: rhythm.item,
  },
});
