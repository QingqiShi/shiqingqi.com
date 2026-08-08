import * as stylex from "@stylexjs/stylex";
import { brand, brandDerived } from "@tuja/ui/brand.stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Identifier } from "../../identifier.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

interface DialRow {
  dial: string;
  clamp: string;
  moves: string;
}

export function VisualLanguageBrandShowcase() {
  // Built in render scope so `moves` can call t(). Clamp ranges are transcribed
  // once from brand.stylex.ts rather than read from the tokens at runtime,
  // which resolve to opaque CSS custom-property references, not readable text.
  const rows: DialRow[] = [
    {
      dial: "brand.radius",
      clamp: "clamp(0, brand.radius, 1.5)",
      moves: t({
        en: "Multiplier on the radius scale. Stops at half a control's height — past that it is a pill, not more of the same look.",
        zh: "圆角阶梯的倍率。止步于控件高度的一半——再往上就成了胶囊形，而非同一观感的延伸。",
      }),
    },
    {
      dial: "brand.density",
      clamp: "clamp(0.75, brand.density, 1.5)",
      moves: t({
        en: "Multiplier on the space scale. Stops where the gap would fall under about 4px, where padding no longer reads as larger than the gap.",
        zh: "间距阶梯的倍率。止步于间隙跌破约 4px 之处——低于这个值，内边距就不再显得比间隙大。",
      }),
    },
    {
      dial: "brand.borderTint",
      clamp: "clamp(4%, brand.borderTint, 18%)",
      moves: t({
        en: "How far a border sits from what it borders, as a colour-mix percentage. Clamped at both ends: too close and there is no edge, too far and it reads as a heavy line.",
        zh: "描边与被描边对象之间的色彩混合比例。两端均设有限制：太近则没有边缘，太远则读成一条粗线。",
      }),
    },
    {
      dial: "brand.translucency",
      clamp: "clamp(0.5, brand.translucency, 1)",
      moves: t({
        en: "Alpha of a translucent surface.",
        zh: "半透明表面的透明度。",
      }),
    },
    {
      dial: "brand.textureGap",
      clamp: "—",
      moves: t({
        en: "Spacing between texture marks.",
        zh: "纹理标记之间的间距。",
      }),
    },
    {
      dial: "brand.washAngle",
      clamp: "—",
      moves: t({ en: "Direction a wash drifts.", zh: "淡彩流动的方向。" }),
    },
    {
      dial: "brand.spring",
      clamp: t({ en: "one of three curves", zh: "三条曲线之一" }),
      moves: t({
        en: "Which of the three springs every control uses. linear() takes literal stops, so a brand picks one rather than interpolating an overshoot of its own.",
        zh: "所有控件所用的三条弹簧曲线之一。linear() 只接受写死的取值点，因此品牌只能三选一，而不能自行插值出一个越冲幅度。",
      }),
    },
    {
      dial: "brand.fontFamily",
      clamp: "—",
      moves: t({ en: "Typeface stack.", zh: "字体族。" }),
    },
    {
      dial: "brand.accentSource",
      clamp: "—",
      moves: t({
        en: "Source colour the accent ramp is generated from. Changing it is a codegen run, not a runtime swap.",
        zh: "生成强调色阶所依据的源色。更改它需要重新运行代码生成，而非运行时切换。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Brand configuration", zh: "品牌配置" })}>
      <ShowcaseHelper>
        {t({
          en: "A brand may configure hue, typeface, radius, density, spring, translucency, border colour, texture and wash — nothing else moves. Three of the nine stop working as dials at the ends, so brandDerived clamps them rather than letting a raw value break the control.",
          zh: "品牌可配置的只有色相、字体、圆角、密度、弹簧、半透明度、描边色、纹理与淡彩——其余一概不动。九项之中有三项在极端取值下会失效，因此 brandDerived 会对其加以限制，而不是任由一个未加约束的值破坏控件。",
        })}
      </ShowcaseHelper>
      <div css={styles.table}>
        {rows.map((row) => (
          <div key={row.dial} css={styles.row}>
            <span css={styles.dial}>
              <Identifier>{row.dial}</Identifier>
            </span>
            <span css={styles.clamp}>{row.clamp}</span>
            <Text variant="bodySmall" tone="muted" css={styles.moves}>
              {row.moves}
            </Text>
          </div>
        ))}
      </div>
      <ShowcaseHelper>
        {t({
          en: "This page sets no brand theme, so every dial resolves to its default — brand.radius and its clamped counterpart, brandDerived.radiusScale, agree below. They diverge only once a theme pushes the raw value past 0–1.5.",
          zh: "本页未设置任何品牌主题，因此每个旋钮都落在默认值上——下面的 brand.radius 与其限制后的对应值 brandDerived.radiusScale 结果一致。只有当某个主题把原始值推到 0–1.5 之外时，二者才会出现分歧。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoRow}>
        <div css={styles.demoItem}>
          <div css={[styles.demoSwatch, styles.demoSwatchRaw]} />
          <span css={styles.demoLabel}>border.radius_3 × brand.radius</span>
        </div>
        <div css={styles.demoItem}>
          <div css={[styles.demoSwatch, styles.demoSwatchClamped]} />
          <span css={styles.demoLabel}>
            border.radius_3 × brandDerived.radiusScale
          </span>
        </div>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  table: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "minmax(9rem, 12rem) minmax(11rem, 15rem) 1fr",
    },
    gap: { default: space._1, [breakpoints.md]: space._3 },
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  dial: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "break-word",
  },
  clamp: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    overflowWrap: "break-word",
  },
  moves: {
    minInlineSize: 0,
    overflowWrap: "break-word",
  },
  demoRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._4,
  },
  demoItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._1,
  },
  demoSwatch: {
    inlineSize: "64px",
    blockSize: "64px",
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  demoSwatchRaw: {
    borderRadius: `calc(${border.radius_3} * ${brand.radius})`,
  },
  demoSwatchClamped: {
    borderRadius: `calc(${border.radius_3} * ${brandDerived.radiusScale})`,
  },
  demoLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
});
