import * as stylex from "@stylexjs/stylex";
import { corner } from "../../primitives/corner.stylex.ts";
import { flex, shrink } from "../../primitives/flex.stylex.ts";
import { border, color, controlSize } from "../../tokens.stylex.ts";
import type { OptionCardRole } from "./option-card.tsx";

/**
 * The default `OptionCard` indicator: an empty ring or box at rest, a filled
 * dot or tick once selected. The mark appearing is the state change, so
 * selection reads without relying on the accent colour (WCAG 1.4.1).
 * @internal
 */
export function SelectionMark({
  role,
  selected,
}: {
  role: OptionCardRole;
  selected: boolean;
}) {
  return (
    <span
      css={[
        flex.inlineCenter,
        shrink._0,
        markStyles.base,
        roleCornerStyles[role],
        selected && markStyles.selected,
      ]}
    >
      {selected && role === "radio" ? (
        <span css={[corner.radius_round, markStyles.dot]} />
      ) : null}
      {selected && role === "checkbox" ? (
        <svg viewBox="0 0 16 16" focusable="false" css={markStyles.tick}>
          <path
            d="M4 8.5l3 3 5-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

const markStyles = stylex.create({
  base: {
    boxSizing: "border-box",
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
    borderWidth: border.size_2,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    color: color.accentOn,
  },
  selected: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  dot: {
    inlineSize: "40%",
    blockSize: "40%",
    backgroundColor: color.accentOn,
  },
  tick: {
    inlineSize: "72%",
    blockSize: "72%",
  },
});

// `radio` and `checkbox` need only a radius, so they map to `corner` directly,
// skipping an empty `markStyles` entry.
const roleCornerStyles = {
  radio: corner.radius_round,
  checkbox: corner.radius_1,
};
