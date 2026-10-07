import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import {
  border,
  color,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { GlassSegmentsSpecimen } from "./glass-segments-specimen.tsx";

/**
 * The ground a glass specimen floats over. Glass blurs its own background, so a
 * plain plate would show nothing: this one carries an accent Wash and a block of
 * copy for the blur to work on.
 */
function BusyGround({
  css,
  children,
}: {
  css?: StyleProp;
  children: ReactNode;
}) {
  return (
    <div css={[wash.toRight, corner.radius_3, styles.ground, css]}>
      <p css={[typeRole.bodySmall, styles.groundCopy]} aria-hidden="true">
        {t({
          en: "A lens floating above the page. What lies beneath it stays visible and loses its detail. Read these words through the glass: they are still there, and the detail has gone.",
          zh: "一枚悬浮在页面上方的透镜。下方的一切仍然可见，只是失去细节。透过玻璃读这些字：它们还在，细节没了。",
        })}
      </p>
      <div css={styles.stack}>{children}</div>
    </div>
  );
}

export function GlassShowcase() {
  const requirements = [
    {
      term: t({ en: "Position the element", zh: "给元素定位" }),
      value: 'position: "relative"',
      note: t({
        en: "The rim is an absolute ::before with inset 0. On an element that is not positioned, it covers the nearest positioned ancestor instead.",
        zh: "边缘是一个 inset 为 0 的绝对定位 ::before。元素若没有定位，它就会盖住最近的已定位祖先元素。",
      }),
    },
    {
      term: t({ en: "Round it with corner", zh: "用 corner 做圆角" }),
      value: "corner.*",
      note: t({
        en: "glassSurface sets no radius. The rim inherits the element's borderRadius and cornerShape, so a corner.* member shapes both.",
        zh: "glassSurface 不设圆角。边缘继承元素的 borderRadius 与 cornerShape，所以一个 corner.* 成员就能同时决定两者的形状。",
      }),
    },
    {
      term: t({
        en: "Tune it through glassTokens",
        zh: "通过 glassTokens 调节",
      }),
      value: "glassTokens.*",
      note: t({
        en: "A backgroundColor, backdropFilter or boxShadow later in css replaces the glass's own, and a ::before of yours collides with the rim. Change the fill, rim and blur through the Tokens below instead.",
        zh: "css 中靠后的 backgroundColor、backdropFilter 或 boxShadow 会取代玻璃自己的值，你自己的 ::before 会与边缘冲突。改为通过下面的令牌调节填充、边缘与模糊。",
      }),
    },
    {
      term: t({
        en: "Turn the blur off over a plain ground",
        zh: "纯色底面上关掉模糊",
      }),
      value: 'backdropFilter: "none"',
      note: t({
        en: "A backdrop blur repaints whenever the element or what is behind it moves. Over an opaque, plain ground it blurs nothing, so SegmentedControl turns it off for its sliding segment. Do the same.",
        zh: "背景模糊在元素或其背后的内容移动时都要重绘。在不透明的纯色底面上它什么也虚化不了，所以 SegmentedControl 为滑动的分段关掉了它。你也这样做。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Glass", zh: "玻璃" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "A translucent fill over a blur of whatever is behind the element, a hairline rim that is brighter along the top and bottom edges, and shadow._2. In light mode the fill is white at 80%, so little shows through; in dark mode it is white at 12%.",
          zh: "一层半透明的填充，叠在元素背后内容的虚化之上；一圈发丝细的边缘，顶边与底边更亮；再加上 shadow._2。浅色模式下填充是 80% 的白色，透出的不多；深色模式下是 12% 的白色。",
        })}
      </ShowcaseHelper>
      <GuideList items={requirements} />

      <Specimen
        caption={t({
          en: "The selected segment is glass sliding over the track",
          zh: "选中的分段是在轨道上滑动的玻璃",
        })}
      >
        <GlassSegmentsSpecimen />
      </Specimen>

      <Specimen
        caption={t({
          en: "A glass card and a glass pill over a busy ground",
          zh: "热闹的底面之上的玻璃卡片与玻璃胶囊",
        })}
      >
        <BusyGround>
          <div css={[glassSurface.base, corner.radius_4, styles.heroCard]}>
            <Text look="bodySmall" weight="semibold">
              {t({ en: "Sorted by rating", zh: "按评分排序" })}
            </Text>
            <Text look="caption" tone="muted">
              {t({ en: "Highest first", zh: "最高的在前" })}
            </Text>
          </div>
          <span
            css={[
              typeRole.label,
              glassSurface.base,
              corner.squircle_round,
              styles.heroPill,
            ]}
          >
            {t({ en: "Change", zh: "更改" })}
          </span>
        </BusyGround>
      </Specimen>

      <UsageSnippet
        code={`import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color } from "@tuja/ui/tokens.stylex";

<div css={[glassSurface.base, corner.radius_4, styles.lens]}>…</div>

const styles = stylex.create({
  lens: {
    // The rim is an absolute pseudo-element, so the element is positioned.
    position: "relative",
    [glassTokens.fill]: \`color-mix(in srgb, \${color.bgAccentSubtle} 70%, transparent)\`,
    [glassTokens.blur]: "24px",
  },
});`}
      />

      <div css={styles.dialGrid}>
        <SpecCard
          token="glassTokens.fill"
          meta="default: color.bgMaterialGlass"
        >
          <Text look="caption" tone="muted">
            {t({
              en: "The translucent fill. Its alpha sets how much shows through; its colour tints the glass.",
              zh: "半透明的填充。它的透明度决定透出多少，它的颜色给玻璃染色。",
            })}
          </Text>
        </SpecCard>
        <SpecCard token="glassTokens.blur" meta="default: 8px">
          <Text look="caption" tone="muted">
            {t({
              en: "The blur radius of the backdrop filter.",
              zh: "背景滤镜的模糊半径。",
            })}
          </Text>
        </SpecCard>
        <SpecCard
          token="glassTokens.border"
          meta="default: color.borderMaterialGlass"
        >
          <Text look="caption" tone="muted">
            {t({
              en: "The rim's colour all the way round. Transparent in dark mode.",
              zh: "边缘一整圈的颜色。深色模式下是透明的。",
            })}
          </Text>
        </SpecCard>
        <SpecCard
          token="glassTokens.highlight"
          meta="default: color.borderMaterialGlassHighlight"
        >
          <Text look="caption" tone="muted">
            {t({
              en: "The brighter colour along the top and bottom of the rim, and in a thin band inside the bottom edge.",
              zh: "边缘顶部与底部更亮的颜色，以及底边内侧的一道细带。",
            })}
          </Text>
        </SpecCard>
      </div>

      <Specimen
        caption={t({
          en: "glassTokens.blur, turned — the same fill over the same ground",
          zh: "调节 glassTokens.blur——同样的填充落在同样的底面上",
        })}
      >
        <BusyGround>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.blur_0,
            ]}
          >
            <span css={[typeRole.caption, styles.lensLabel]}>blur 0px</span>
          </div>
          <div css={[glassSurface.base, corner.radius_4, styles.lens]}>
            <span css={[typeRole.caption, styles.lensLabel]}>blur 8px</span>
          </div>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.blur_24,
            ]}
          >
            <span css={[typeRole.caption, styles.lensLabel]}>blur 24px</span>
          </div>
        </BusyGround>
      </Specimen>

      <Specimen
        caption={t({
          en: "glassTokens.fill, turned — how see-through the glass is, and what colour it carries",
          zh: "调节 glassTokens.fill——玻璃有多透，以及它带着什么颜色",
        })}
      >
        <BusyGround>
          <div css={[glassSurface.base, corner.radius_4, styles.lens]}>
            <span css={[typeRole.caption, styles.lensLabel]}>
              glassTokens.fill
            </span>
          </div>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.halfFill,
            ]}
          >
            <span css={[typeRole.caption, styles.lensLabel]}>
              {t({ en: "half the fill", zh: "填充的一半" })}
            </span>
          </div>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.accentFill,
            ]}
          >
            <span css={[typeRole.caption, styles.lensLabel]}>
              bgAccentSubtle 70%
            </span>
          </div>
        </BusyGround>
      </Specimen>
    </Showcase>
  );
}

const styles = stylex.create({
  ground: {
    [washTokens.tone]: color.bgAccentSubtle,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: space._5,
    minBlockSize: "196px",
    backgroundColor: color.bgSurfaceSunken,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  // Centred on the plate rather than filling it, so the glass always lands on
  // the copy and the blur has something to work on.
  groundCopy: {
    position: "absolute",
    insetInline: 0,
    insetBlockStart: "50%",
    transform: "translateY(-50%)",
    margin: 0,
    paddingInline: space._3,
    color: color.fgMuted,
  },
  stack: {
    position: "relative",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.item,
    maxInlineSize: "100%",
  },
  heroCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._4,
    inlineSize: "15rem",
    maxInlineSize: "100%",
  },
  heroPill: {
    [cornerTokens.height]: controlSize._9,
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    blockSize: cornerTokens.height,
    paddingInline: space._4,
    fontWeight: font.weight_6,
    color: color.fg,
  },
  dialGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: rhythm.item,
  },
  // Wide enough for the longest label: a token name is the content, and must not
  // be truncated or broken mid-word.
  lens: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space._3,
    inlineSize: "13rem",
    maxInlineSize: "100%",
    blockSize: "88px",
  },
  lensLabel: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  blur_0: {
    [glassTokens.blur]: "0px",
  },
  blur_24: {
    [glassTokens.blur]: "24px",
  },
  // A Token cannot refer to itself. Thus, mix the colour that it has by default.
  halfFill: {
    [glassTokens.fill]: `color-mix(in srgb, ${color.bgMaterialGlass} 50%, transparent)`,
  },
  accentFill: {
    [glassTokens.fill]: `color-mix(in srgb, ${color.bgAccentSubtle} 70%, transparent)`,
  },
});
