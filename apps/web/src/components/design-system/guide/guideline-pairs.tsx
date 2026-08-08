import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { measure } from "../measure.stylex.ts";

interface GuidelinePair {
  /**
   * What the pair demonstrates — a quality, a word, a slot. Optional, and a
   * slot rather than a string so a caller can mark it up; the cells carry the
   * meaning either way. Rendered at body size and unstyled beyond that, so a
   * caller can show the words themselves rather than a label about them.
   */
  label?: ReactNode;
  recommended: string;
  notRecommended: string;
}

interface GuidelinePairsProps {
  pairs: GuidelinePair[];
}

/**
 * A run of recommended / not-recommended copy examples. Each cell names itself
 * for a screen reader rather than relying on a column header, so the grid can
 * collapse to one column without the two halves becoming indistinguishable.
 */
export function GuidelinePairs({ pairs }: GuidelinePairsProps) {
  const recommendedLabel = t({ en: "Recommended", zh: "推荐" });
  const notRecommendedLabel = t({ en: "Not recommended", zh: "不推荐" });
  return (
    <div css={styles.list}>
      {pairs.map((pair) => (
        <div key={pair.recommended} css={styles.row}>
          {pair.label ? <p css={styles.label}>{pair.label}</p> : null}
          <div css={styles.pair}>
            <p css={[corner.radius_2, styles.cell, styles.good]}>
              <span css={[styles.icon, styles.goodIcon]}>
                <CheckIcon weight="bold" aria-hidden />
              </span>
              <span>
                <span css={a11y.srOnly}>{recommendedLabel}: </span>
                {pair.recommended}
              </span>
            </p>
            <p css={[corner.radius_2, styles.cell, styles.bad]}>
              <span css={[styles.icon, styles.badIcon]}>
                <XIcon weight="bold" aria-hidden />
              </span>
              <span>
                <span css={a11y.srOnly}>{notRecommendedLabel}: </span>
                {pair.notRecommended}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minInlineSize: 0,
  },
  label: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  // Sized against the space the pair actually has, not the viewport: these run
  // in a column beside a sidebar, and two 14rem cells wrap every line twice.
  pair: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: space._1,
  },
  cell: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: space._1,
    margin: 0,
    paddingBlock: space._2,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMain,
    minInlineSize: 0,
  },
  // Nudged down so the glyph sits on the first line's baseline, not its box top.
  icon: {
    display: "inline-flex",
    marginBlockStart: "0.15em",
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_0,
  },
  good: {
    backgroundColor: color.surfaceSuccessSubtle,
    borderColor: color.successBorder,
  },
  goodIcon: {
    color: color.successText,
  },
  bad: {
    backgroundColor: color.surfaceDangerSubtle,
    borderColor: color.dangerBorder,
  },
  badIcon: {
    color: color.dangerText,
  },
});
