import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";

export function LineHeightsShowcase() {
  const sample = t({
    en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
    zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
  });
  return (
    <Showcase label={t({ en: "Line heights", zh: "行高" })}>
      <ShowcaseHelper>
        {t({
          en: "Same passage at every line-height — rhythm tightens at the bottom of the scale and opens up toward the top.",
          zh: "同一段文字以不同行高呈现——下端紧凑、上端舒缓。",
        })}
      </ShowcaseHelper>
      <div css={styles.grid}>
        <SpecCard token="font.lineHeight_00" meta="0.95">
          <p css={[styles.sample, styles.lh00]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_0" meta="1">
          <p css={[styles.sample, styles.lh0]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_1" meta="1.1">
          <p css={[styles.sample, styles.lh1]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_2" meta="1.2">
          <p css={[styles.sample, styles.lh2]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_3" meta="1.3">
          <p css={[styles.sample, styles.lh3]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_4" meta="1.5">
          <p css={[styles.sample, styles.lh4]}>{sample}</p>
        </SpecCard>
        <SpecCard token="font.lineHeight_5" meta="2">
          <p css={[styles.sample, styles.lh5]}>{sample}</p>
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
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(4, minmax(0, 1fr))",
    },
    gap: space._2,
    alignItems: "start",
  },
  sample: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  lh00: { lineHeight: font.lineHeight_00 },
  lh0: { lineHeight: font.lineHeight_0 },
  lh1: { lineHeight: font.lineHeight_1 },
  lh2: { lineHeight: font.lineHeight_2 },
  lh3: { lineHeight: font.lineHeight_3 },
  lh4: { lineHeight: font.lineHeight_4 },
  lh5: { lineHeight: font.lineHeight_5 },
});
