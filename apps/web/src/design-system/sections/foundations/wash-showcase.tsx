import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function WashShowcase() {
  return (
    <Showcase label={t({ en: "Wash", zh: "淡彩" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "A linear gradient from one tone to transparent, across the whole element, in one of four directions. The element's background colour shows through as the tone fades, so the wash only shifts the surface's colour toward one edge.",
          zh: "一道从某种色调渐变到透明的线性渐变，铺满整个元素，有四个方向可选。色调变淡时元素的背景色透出来，所以淡彩只是让表面的颜色朝一侧偏移。",
        })}
      </ShowcaseHelper>

      <SpecimenGrid css={styles.directionTracks}>
        <Specimen token="wash.toBottom">
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_3,
              styles.card,
            ]}
          />
        </Specimen>
        <Specimen token="wash.toTop">
          <div
            css={[wash.toTop, cardSurface.base, corner.radius_3, styles.card]}
          />
        </Specimen>
        <Specimen token="wash.toRight">
          <div
            css={[wash.toRight, cardSurface.base, corner.radius_3, styles.card]}
          />
        </Specimen>
        <Specimen token="wash.toLeft">
          <div
            css={[wash.toLeft, cardSurface.base, corner.radius_3, styles.card]}
          />
        </Specimen>
      </SpecimenGrid>

      <SpecimenGrid>
        <Specimen caption={t({ en: "the default tone", zh: "默认色调" })}>
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_3,
              styles.toneCard,
            ]}
          />
        </Specimen>
        <Specimen caption="tone" token="color.bgAccentSubtle">
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_3,
              styles.toneCard,
              styles.accentCard,
            ]}
          />
        </Specimen>
      </SpecimenGrid>

      <SpecCard token="washTokens.tone" meta="default: color.bgNeutralSubtle">
        <Text look="caption" tone="muted">
          {t({
            en: "The tone the gradient starts from. It is the only dial, so it sets both the colour and how strong the wash is: a tone close to the background colour gives a faint wash.",
            zh: "渐变起始的色调。它是唯一的旋钮，所以同时决定颜色与淡彩的强度：色调越接近背景色，淡彩越淡。",
          })}
        </Text>
      </SpecCard>

      <UsageSnippet
        code={`import { cardSurface } from "@tuja/ui/components/card.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import { color } from "@tuja/ui/tokens.stylex";

<div css={[cardSurface.base, wash.toBottom, styles.card]} />

const styles = stylex.create({
  // The gradient fades into cardSurface's color.bgSurface.
  card: { [washTokens.tone]: color.bgAccentSubtle },
});`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  card: {
    blockSize: "104px",
    backgroundColor: color.bgSurfaceSunken,
  },
  // Four directions read as a set, so the tracks are narrow enough to hold all
  // four on one row and still stack at phone width.
  directionTracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(140px, 1fr))",
    },
  },
  toneCard: {
    blockSize: "120px",
    backgroundColor: color.bgSurfaceSunken,
  },
  accentCard: {
    [washTokens.tone]: color.bgAccentSubtle,
  },
});
