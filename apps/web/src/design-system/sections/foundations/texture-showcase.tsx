import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function TextureShowcase() {
  return (
    <Showcase label={t({ en: "Texture", zh: "纹理" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "A dot 1px across, drawn with a gradient and repeated on a square grid. The dot keeps one size; you set how far apart the dots are and what colour they take, through two Tokens in a local stylex.create.",
          zh: "一个 1px 宽的点，用渐变绘制，在方形网格上重复。点只有一种尺寸；点与点相距多远、取什么颜色，由你在本地 stylex.create 中通过两个令牌设定。",
        })}
      </ShowcaseHelper>

      <Specimen token="texture.dot">
        <div
          css={[texture.dot, cardSurface.base, corner.radius_3, styles.card]}
        />
      </Specimen>

      <SpecimenGrid css={styles.pitchTracks}>
        <Specimen caption={t({ en: "pitch", zh: "间距" })} token="space._4">
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_3,
              styles.card,
              styles.wide,
            ]}
          />
        </Specimen>
        <Specimen
          caption={t({ en: "pitch — the default", zh: "间距——默认" })}
          token="space._1"
        >
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_3,
              styles.card,
              styles.fine,
            ]}
          />
        </Specimen>
      </SpecimenGrid>

      <SpecimenGrid>
        <Specimen caption={t({ en: "ink — the default", zh: "墨色——默认" })}>
          <div
            css={[texture.dot, cardSurface.base, corner.radius_3, styles.card]}
          />
        </Specimen>
        <Specimen
          caption={t({ en: "ink", zh: "墨色" })}
          token="color.borderAccent"
        >
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_3,
              styles.card,
              styles.accentInk,
            ]}
          />
        </Specimen>
      </SpecimenGrid>

      <div css={styles.dialGrid}>
        <SpecCard token="textureTokens.pitch" meta="default: space._1">
          <Text look="caption" tone="muted">
            {t({
              en: "The distance between dots. Take it from space._0 or a larger step. The grid is offset by half a pitch, and half of those steps is a whole pixel at a 16px root, which keeps each dot on the centre of a pixel. With space._00 it is not, and the dots blur.",
              zh: "点与点之间的距离。取 space._0 或更大的一级。网格偏移半个间距，在 16px 根字号下，这些步长的一半都是整像素，每个点因此落在像素中心。space._00 做不到，点就会糊。",
            })}
          </Text>
        </SpecCard>
        <SpecCard token="textureTokens.ink" meta="default: color.fg at 20%">
          <Text look="caption" tone="muted">
            {t({
              en: "The dot's colour. The default mixes color.fg into transparent, so it follows the colour scheme like every colour Token.",
              zh: "点的颜色。默认值把 color.fg 与透明混合，因此像所有颜色令牌一样随配色方案变化。",
            })}
          </Text>
        </SpecCard>
      </div>

      <UsageSnippet
        code={`import { cardSurface } from "@tuja/ui/components/card.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";

<div css={[cardSurface.base, texture.dot, styles.card]} />

const styles = stylex.create({
  card: {
    [textureTokens.pitch]: space._4,
    [textureTokens.ink]: color.borderAccent,
  },
});`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  card: {
    blockSize: "104px",
  },
  // The wide field and the small card sit side by side rather than nested, so
  // the two pitches can be compared without stacking one texture on another.
  pitchTracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "minmax(0, 2fr) minmax(0, 1fr)",
    },
  },
  wide: {
    [textureTokens.pitch]: space._4,
    blockSize: "132px",
  },
  fine: {
    [textureTokens.pitch]: space._1,
    blockSize: "132px",
  },
  accentInk: {
    [textureTokens.ink]: color.borderAccent,
    backgroundColor: color.bgAccentSubtle,
    borderColor: color.borderAccent,
  },
  dialGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._2,
  },
});
