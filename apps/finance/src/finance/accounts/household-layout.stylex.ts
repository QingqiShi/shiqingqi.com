import * as stylex from "@stylexjs/stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";

/** Where the column has room for the cards in a column beside the trend. */
const BESIDE = "@container (min-width: 64rem)";

export const householdLayout = stylex.create({
  body: {
    display: "flex",
    flexDirection: { default: "column", [BESIDE]: "row" },
    flexGrow: 1,
    gap: { default: rhythm.group, [BESIDE]: rhythm.item },
  },
  // Beside the trend, the column takes its height from the trend, and the
  // list of movers fills it. So its content must not set its height.
  cards: {
    display: "flex",
    flexDirection: { default: "row", [BESIDE]: "column" },
    flexWrap: { default: "wrap", [BESIDE]: "nowrap" },
    alignItems: { default: "flex-start", [BESIDE]: "stretch" },
    flexShrink: 0,
    inlineSize: { default: "auto", [BESIDE]: "24rem" },
    contain: { default: null, [BESIDE]: "size" },
    gap: rhythm.item,
  },
  narrowCard: {
    flexGrow: { default: 2, [BESIDE]: 0 },
    flexBasis: { default: 0, [BESIDE]: "auto" },
    minInlineSize: "min(100%, 18rem)",
  },
  // The bars of the movers need the width, so the card goes under "Needs a
  // look" before they get short.
  wideCard: {
    flexGrow: { default: 3, [BESIDE]: 1 },
    flexBasis: { default: 0, [BESIDE]: "auto" },
    minInlineSize: "min(100%, 22rem)",
  },
});
