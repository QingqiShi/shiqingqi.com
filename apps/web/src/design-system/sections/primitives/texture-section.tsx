import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

export function TextureSection() {
  const api: ApiEntry[] = [
    {
      token: "texture.dot",
      meta: "radial-gradient · 1px dot",
      description: t({
        en: "A dot of 1px or less, repeated at the pitch.",
        zh: "不超过 1px 的点，按间距重复。",
      }),
    },
    {
      token: "textureTokens.pitch",
      meta: "default: space._1",
      description: t({
        en: "The distance between dots. Take it from space._0 or a larger step.",
        zh: "点与点之间的距离。取 space._0 或更大的一级。",
      }),
    },
    {
      token: "textureTokens.ink",
      meta: "default: color.fg at 20%",
      description: t({
        en: "The dot's colour. The default mixes color.fg into transparent, so it follows the colour scheme.",
        zh: "点的颜色。默认值把 color.fg 混入透明色，因此会随配色方案变化。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Texture", zh: "纹理" })}>
      <ShowcaseHelper>
        {t({
          en: "A dot 1px across, repeated on a square grid over the element's background colour. Set the pitch and the ink per surface through the Tokens in a local style. When to use it is on the Material page.",
          zh: "一个 1px 的点，在元素背景色之上按方格重复。通过局部样式中的令牌，为每个表面设定间距与墨色。何时使用见质感页。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen token="texture.dot">
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_2,
              styles.materialCard,
            ]}
          />
        </Specimen>
        <Specimen
          caption={t({ en: "wider pitch", zh: "更宽的间距" })}
          token="space._4"
        >
          <div
            css={[
              texture.dot,
              cardSurface.base,
              corner.radius_2,
              styles.materialCard,
              styles.widePitch,
            ]}
          />
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";

<div css={[texture.dot, styles.card]}>…</div>

const styles = stylex.create({
  card: { [textureTokens.pitch]: space._4 },
});`}
      />
    </Showcase>
  );
}

export function WashSection() {
  const api: ApiEntry[] = [
    {
      token: "wash.toBottom / toTop",
      meta: "linear-gradient · tone → transparent",
      description: t({
        en: "The tone drifts down the surface, or up it.",
        zh: "色调沿表面向下或向上铺开。",
      }),
    },
    {
      token: "wash.toRight / toLeft",
      meta: "linear-gradient · tone → transparent",
      description: t({
        en: "The same drift across the inline axis.",
        zh: "同样的铺开，沿行内轴方向。",
      }),
    },
    {
      token: "washTokens.tone",
      meta: "default: color.bgNeutralSubtle",
      description: t({
        en: "The tone the gradient starts from. It is the only dial, so it sets both the colour and how strong the wash is.",
        zh: "渐变起始的颜色。它是唯一的调节项，因此同时决定颜色与淡彩的强弱。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Wash", zh: "淡彩" })}>
      <ShowcaseHelper>
        {t({
          en: "A linear gradient from one tone to transparent, across the whole element, so the element's background colour shows through as the tone fades. When to use it is on the Material page.",
          zh: "从一种颜色渐变到透明的线性渐变，铺满整个元素，因此颜色淡去时元素的背景色会透出来。何时使用见质感页。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen token="wash.toBottom">
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_2,
              styles.washCard,
            ]}
          />
        </Specimen>
        <Specimen token="wash.toRight">
          <div
            css={[
              wash.toRight,
              cardSurface.base,
              corner.radius_2,
              styles.washCard,
            ]}
          />
        </Specimen>
        <Specimen caption="tone" token="color.bgAccentSubtle">
          <div
            css={[
              wash.toBottom,
              cardSurface.base,
              corner.radius_2,
              styles.washCard,
              styles.accentTone,
            ]}
          />
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";

<div css={[wash.toBottom, styles.card]}>…</div>

const styles = stylex.create({
  card: { [washTokens.tone]: color.bgAccentSubtle },
});`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // Texture + wash specimens — the primitive owns the background image and
  // `cardSurface.base` the border, so these only add the height (and, for
  // Wash, the sunken ground).
  materialCard: {
    blockSize: "88px",
  },
  widePitch: {
    [textureTokens.pitch]: space._4,
  },
  washCard: {
    blockSize: "88px",
    backgroundColor: color.bgSurfaceSunken,
  },
  accentTone: {
    [washTokens.tone]: color.bgAccentSubtle,
    backgroundColor: color.bgAccentSubtle,
    borderColor: color.borderAccent,
  },
});
