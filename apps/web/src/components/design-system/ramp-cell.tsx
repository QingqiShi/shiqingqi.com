import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";

interface RampCellProps {
  bg: StyleXStyles;
  fg: StyleXStyles;
  label: string;
  token: string;
  span?: StyleXStyles;
  numbered?: boolean;
  compact?: boolean;
}

export function RampCell({
  bg,
  fg,
  label,
  token,
  span,
  numbered,
  compact,
}: RampCellProps) {
  return (
    <div css={[styles.cell, bg, span, compact && styles.compact]}>
      <span css={[styles.label, fg, numbered && styles.labelNumbered]}>
        {label}
      </span>
      <span css={[styles.token, fg, numbered && styles.tokenNumbered]}>
        {token}
      </span>
    </div>
  );
}

const styles = stylex.create({
  cell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBlock: space._3,
    paddingInline: space._3,
    gap: space._0,
    minInlineSize: 0,
    minBlockSize: {
      default: "72px",
      [breakpoints.md]: "140px",
    },
    overflow: "hidden",
  },
  compact: {
    paddingBlock: space._2,
    minBlockSize: {
      default: "56px",
      [breakpoints.md]: "72px",
    },
  },
  label: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingSnug,
    lineHeight: font.lineHeight_2,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    opacity: 0.85,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },
  // Numbered cells (1–5) get narrow as soon as they sit in a row — the bg/dim
  // cells already establish the "color.backgroundN" pattern, so hide redundant
  // token text and feature the number itself.
  tokenNumbered: {
    display: {
      default: "block",
      [breakpoints.md]: "none",
    },
  },
  labelNumbered: {
    fontSize: {
      default: font.uiBodySmall,
      [breakpoints.md]: font.uiHeading2,
    },
  },
});
