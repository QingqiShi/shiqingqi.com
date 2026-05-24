import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";

export function LetterSpacingShowcase() {
  const refinedDisplay = t({ en: "Refined display", zh: "精致展示" });
  return (
    <Showcase label={t({ en: "Letter spacing", zh: "字距" })}>
      <div css={styles.grid}>
        <SpecCard token="font.trackingTight" meta="-0.025em">
          <span css={[styles.sample, styles.tight]}>{refinedDisplay}</span>
        </SpecCard>
        <SpecCard token="font.trackingSnug" meta="-0.01em">
          <span css={[styles.sample, styles.snug]}>{refinedDisplay}</span>
        </SpecCard>
        <SpecCard token="font.trackingNormal" meta="0">
          <span css={[styles.sample, styles.normal]}>{refinedDisplay}</span>
        </SpecCard>
        <SpecCard token="font.trackingWide" meta="0.025em">
          <span css={[styles.sample, styles.wide]}>{refinedDisplay}</span>
        </SpecCard>
        <SpecCard token="font.trackingWider" meta="0.05em">
          <span css={[styles.sample, styles.wider]}>
            {t({ en: "Overline label", zh: "上线标签" })}
          </span>
        </SpecCard>
        <SpecCard token="font.trackingWidest" meta="0.12em">
          <span css={[styles.sample, styles.widest]}>
            {t({ en: "Eyebrow heading", zh: "眉题标签" })}
          </span>
        </SpecCard>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.sm]: "repeat(2, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(3, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  sample: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_5,
    color: color.textMain,
    paddingBlock: space._1,
  },
  tight: { letterSpacing: font.trackingTight },
  snug: { letterSpacing: font.trackingSnug },
  normal: { letterSpacing: font.trackingNormal },
  wide: { letterSpacing: font.trackingWide },
  wider: {
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
  },
  widest: {
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
  },
});
