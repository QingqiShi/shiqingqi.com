import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function WashShowcase() {
  return (
    <Showcase label={t({ en: "Wash", zh: "淡彩" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "A broad gradient that gives a surface some volume — one tone drifting across it, with no bright spot anywhere. A bright spot reads as a light source, and only Glass is lit.",
          zh: "一种色调在整个表面上缓缓铺开，给它一点体量，任何地方都没有亮斑。亮斑读起来是光源，而只有玻璃是被照亮的。",
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
        <Specimen caption="tone" token="color.surfaceAccentSubtle">
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
        <Specimen caption="tone" token="color.surfaceAccentMuted">
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_3,
              styles.toneCard,
              styles.accentCard,
              styles.mutedTone,
            ]}
          />
        </Specimen>
      </SpecimenGrid>

      <SpecCard
        token="washTokens.tone"
        meta="default: color.surfaceNeutralSubtle"
      >
        <Text variant="caption" tone="muted">
          {t({
            en: "The tone is the one dial, and it sets both the colour and the strength: a Subtle tone lifts the surface a little, a Muted one gives it more weight. An accent tone belongs only on a surface that already carries the accent; anywhere else it turns a wash into decoration.",
            zh: "色调是唯一的旋钮，它同时决定颜色与强度：Subtle 的色调把表面略微抬起，Muted 的色调给它更多分量。意图色的色调只属于本身已经带有该意图色的表面；用在别处，淡彩就变成了装饰。",
          })}
        </Text>
      </SpecCard>

      <UsageSnippet
        code={`import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";

<div css={[wash.toBottom, cardSurface.base, corner.radius_3, styles.card]} />

const styles = stylex.create({
  card: { [washTokens.tone]: color.surfaceAccentMuted },
});`}
      />

      <DoDont
        do={
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_3,
              styles.doCard,
            ]}
          />
        }
        doCaption={t({
          en: "One tone drifting across the surface.",
          zh: "一种色调在表面上缓缓铺开。",
        })}
        dont={
          <div css={[cardSurface.base, corner.radius_3, styles.dontCard]} />
        }
        dontCaption={t({
          en: "A bright spot in the middle. The eye reads it as a light source, and only Glass is lit.",
          zh: "中间一块亮斑。眼睛把它读成光源，而只有玻璃是被照亮的。",
        })}
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
    [washTokens.tone]: color.surfaceAccentSubtle,
    backgroundColor: color.surfaceAccentSubtle,
    borderColor: color.accentBorder,
  },
  mutedTone: {
    [washTokens.tone]: color.surfaceAccentMuted,
  },
  doCard: {
    inlineSize: "100%",
    blockSize: "104px",
    backgroundColor: color.bgSurfaceSunken,
  },
  // The mistake, drawn: the same wash with the glass highlight punched into the
  // middle of it. `wash` cannot make this shape, so the layers are written out.
  dontCard: {
    inlineSize: "100%",
    blockSize: "104px",
    backgroundColor: color.bgSurfaceSunken,
    backgroundImage: `radial-gradient(circle at 50% 50%, ${color.glassHighlight}, transparent 62%), linear-gradient(to bottom, ${color.surfaceNeutralSubtle}, transparent)`,
  },
});
