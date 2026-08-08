"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

interface DoDontProps {
  /** The recommended example. */
  do: ReactNode;
  /** Caption for the recommended example — already localised by the caller. */
  doCaption: string;
  /** The discouraged example. */
  dont: ReactNode;
  /** Caption for the discouraged example — already localised by the caller. */
  dontCaption: string;
}

/**
 * A side-by-side "do / don't" pair. Each panel carries its meaning through a
 * full token-themed background (success vs danger) and a top label row with an
 * icon — never a leading-edge accent bar (see DESIGN.md). Collapses to a single
 * column on narrow viewports.
 */
export function DoDont({
  do: doExample,
  doCaption,
  dont,
  dontCaption,
}: DoDontProps) {
  const doLabel = t({ en: "Do", zh: "推荐" });
  const dontLabel = t({ en: "Don't", zh: "避免" });
  return (
    <div css={styles.grid}>
      <div css={[corner.radius_2, styles.panel, styles.doPanel]}>
        <div css={styles.header}>
          <span css={[styles.icon, styles.doText]}>
            <CheckIcon />
          </span>
          <Text
            as="span"
            variant="caption"
            weight="semibold"
            css={styles.doText}
          >
            {doLabel}
          </Text>
        </div>
        <div css={styles.example}>{doExample}</div>
        <Text variant="caption" tone="muted">
          {doCaption}
        </Text>
      </div>
      <div css={[corner.radius_2, styles.panel, styles.dontPanel]}>
        <div css={styles.header}>
          <span css={[styles.icon, styles.dontText]}>
            <CrossIcon />
          </span>
          <Text
            as="span"
            variant="caption"
            weight="semibold"
            css={styles.dontText}
          >
            {dontLabel}
          </Text>
        </div>
        <div css={styles.example}>{dont}</div>
        <Text variant="caption" tone="muted">
          {dontCaption}
        </Text>
      </div>
    </div>
  );
}

/** Inline check icon on the shared 256 viewBox / 16-unit round-stroke metrics. */
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M40 128 104 192 216 64"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline cross icon matching {@link CheckIcon}'s metrics. */
function CrossIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}

const styles = stylex.create({
  // Pairs up when the pair has room for it, rather than when the screen does —
  // this often sits in a column narrower than the viewport suggests.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: space._3,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    minInlineSize: 0,
  },
  doPanel: {
    backgroundColor: color.surfaceSuccessSubtle,
    borderColor: color.successBorder,
  },
  dontPanel: {
    backgroundColor: color.surfaceDangerSubtle,
    borderColor: color.dangerBorder,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  icon: {
    display: "inline-flex",
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_0,
  },
  doText: {
    color: color.successText,
  },
  dontText: {
    color: color.dangerText,
  },
  // A specimen that cannot shrink — a segmented control with too many segments,
  // say — scrolls inside the panel rather than spilling past its border.
  example: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
    overflowX: "auto",
  },
});
