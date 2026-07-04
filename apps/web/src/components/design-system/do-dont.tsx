"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

interface DoDontProps {
  /** The recommended example. */
  do: ReactNode;
  /** Caption for the recommended example — already localized by the caller. */
  doCaption: string;
  /** The discouraged example. */
  dont: ReactNode;
  /** Caption for the discouraged example — already localized by the caller. */
  dontCaption: string;
}

/**
 * A side-by-side "do / don't" pair. Each panel carries its meaning through a
 * full token-themed background (success vs danger) and a top label row with a
 * glyph — never a leading-edge accent bar (see DESIGN.md). Collapses to a single
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
      <div css={[styles.panel, styles.doPanel]}>
        <div css={styles.header}>
          <span css={[styles.glyph, styles.doText]}>
            <CheckGlyph />
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
      <div css={[styles.panel, styles.dontPanel]}>
        <div css={styles.header}>
          <span css={[styles.glyph, styles.dontText]}>
            <CrossGlyph />
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

/** Inline check glyph on the shared 256 viewBox / 16-unit round-stroke metrics. */
function CheckGlyph() {
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

/** Inline cross glyph matching {@link CheckGlyph}'s metrics. */
function CrossGlyph() {
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
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
    gap: space._3,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
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
  glyph: {
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
  example: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
  },
});
