import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";

export function WeightsShowcase() {
  return (
    <Showcase label={t({ en: "Weights", zh: "字重" })}>
      <div css={styles.grid}>
        <SpecCard token="font.weight_1" meta="100">
          <span css={[styles.specimen, styles.weight1]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_2" meta="200">
          <span css={[styles.specimen, styles.weight2]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_3" meta="300">
          <span css={[styles.specimen, styles.weight3]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_4" meta="400">
          <span css={[styles.specimen, styles.weight4]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_5" meta="500">
          <span css={[styles.specimen, styles.weight5]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_6" meta="600">
          <span css={[styles.specimen, styles.weight6]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_7" meta="700">
          <span css={[styles.specimen, styles.weight7]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_8" meta="800">
          <span css={[styles.specimen, styles.weight8]}>Ag</span>
        </SpecCard>
        <SpecCard token="font.weight_9" meta="900">
          <span css={[styles.specimen, styles.weight9]}>Ag</span>
        </SpecCard>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [breakpoints.sm]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(5, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(9, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  specimen: {
    fontSize: font.uiSubDisplay,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
    color: color.textMain,
    paddingBlock: space._1,
  },
  weight1: { fontWeight: font.weight_1 },
  weight2: { fontWeight: font.weight_2 },
  weight3: { fontWeight: font.weight_3 },
  weight4: { fontWeight: font.weight_4 },
  weight5: { fontWeight: font.weight_5 },
  weight6: { fontWeight: font.weight_6 },
  weight7: { fontWeight: font.weight_7 },
  weight8: { fontWeight: font.weight_8 },
  weight9: { fontWeight: font.weight_9 },
});
