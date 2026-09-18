import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function TextureShowcase() {
  return (
    <Showcase label={t({ en: "Texture", zh: "纹理" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "One drawn dot of 1px or less, repeated at one size and kept faint enough that it never resolves into a pattern with a name. If it reads as graph paper, or as a ledger, it is too strong. The pitch and the ink are set per surface, so a smaller surface takes a finer mark.",
          zh: "一个绘制的点，不超过 1px，只用一种尺寸重复，淡到永远不会显出一个叫得出名字的图案。如果它读起来像方格纸或账簿，就太强了。间距与墨色按表面设定，因此较小的表面取更细的标记。",
        })}
      </ShowcaseHelper>

      <Specimen token="texture.dot">
        <div
          css={[texture.dot, cardSurface.base, corner.radius_3, styles.card]}
        />
      </Specimen>

      <SpecimenGrid css={styles.pitchTracks}>
        <Specimen
          caption={t({ en: "a wide surface — pitch", zh: "宽表面——间距" })}
          token="space._4"
        >
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
          caption={t({ en: "a small card — pitch", zh: "小卡片——间距" })}
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
              en: "The gap between marks. Raise it on a wide surface, lower it on a small card. The mark itself keeps one size; the pitch is the only dimension that moves.",
              zh: "标记之间的间隔。宽表面调大，小卡片调小。标记本身只有一种尺寸；间距是唯一会变的尺寸。",
            })}
          </Text>
        </SpecCard>
        <SpecCard token="textureTokens.ink" meta="default: color.fg at 20%">
          <Text look="caption" tone="muted">
            {t({
              en: "The mark's colour. Keep it close to the surface it sits on.",
              zh: "标记的颜色。让它贴近所处的表面。",
            })}
          </Text>
        </SpecCard>
      </div>

      <UsageSnippet
        code={`import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";

<div css={[texture.dot, cardSurface.base, corner.radius_3, styles.card]} />

const styles = stylex.create({
  card: {
    [textureTokens.pitch]: space._4,
    [textureTokens.ink]: color.borderAccent,
  },
});`}
      />

      <DoDont
        do={
          <div css={[cardSurface.base, corner.radius_3, styles.plainGround]}>
            <div
              css={[
                texture.dot,
                cardSurface.base,
                corner.radius_2,
                styles.inner,
              ]}
            />
          </div>
        }
        doCaption={t({
          en: "A textured card on a plain page.",
          zh: "纹理卡片放在没有纹理的页面上。",
        })}
        dont={
          // The only nested texture on the site. It is the mistake itself, so
          // the specimen must draw it.
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_3,
              styles.texturedGround,
            ]}
          >
            <div
              css={[
                texture.dot,
                cardSurface.base,
                corner.radius_2,
                styles.inner,
              ]}
            />
          </div>
        }
        dontCaption={t({
          en: "A textured card inside a textured surface. Two patterns sit in line, and neither reads as the surface it belongs to.",
          zh: "纹理卡片放在有纹理的表面里。两个图案叠在一条视线上，哪一个都读不出自己所属的表面。",
        })}
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
  plainGround: {
    inlineSize: "100%",
    padding: space._3,
    backgroundColor: color.bgSurfaceSunken,
  },
  texturedGround: {
    [textureTokens.pitch]: space._0,
    inlineSize: "100%",
    padding: space._3,
    backgroundColor: color.bgSurfaceSunken,
  },
  inner: {
    blockSize: "64px",
  },
});
