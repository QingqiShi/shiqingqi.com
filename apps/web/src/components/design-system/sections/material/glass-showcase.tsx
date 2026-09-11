import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { wash, washTokens } from "@tuja/ui/primitives/wash.stylex";
import {
  border,
  color,
  controlSize,
  font,
  space,
} from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { Identifier } from "../../identifier.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
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
      <p css={styles.groundCopy} aria-hidden="true">
        {t({
          en: "A lens floating above the page. What lies beneath it stays visible and loses its detail. The face is flat, the light falls from straight above, and the rim carries it along the top and again along the bottom. Read these words through the glass: they are still there, and the detail has gone.",
          zh: "一枚悬浮在页面上方的透镜。下方的一切仍然可见，只是失去细节。正面是平的，光线自正上方落下，边缘在顶部承接它，又在底部再次承接。透过玻璃读这些字：它们还在，细节没了。",
        })}
      </p>
      <div css={styles.stack}>{children}</div>
    </div>
  );
}

function Part({
  name,
  token,
  children,
}: {
  name: string;
  token: string;
  children: ReactNode;
}) {
  return (
    <div css={styles.part}>
      <dt css={styles.partName}>{name}</dt>
      <dd css={styles.partBody}>
        <span css={styles.partToken}>
          <Identifier>{token}</Identifier>
        </span>
        <Text look="caption" tone="muted">
          {children}
        </Text>
      </dd>
    </div>
  );
}

export function GlassShowcase() {
  return (
    <Showcase label={t({ en: "Glass", zh: "玻璃" })} frame="plain" breakout>
      <ShowcaseHelper>
        {t({
          en: "The one surface that catches light, and the one that casts a shadow — a lens floating above what it sits on, lit from straight above. A see-through fill blurs what lies beneath it, the face stays flat, and a hairline rim in the border colour runs all the way round: lit along the top and again along the bottom where the light leaves, gone down the sides. A one-pixel band inside the bottom edge is that light bounced back, and the Button's shadow sits under the whole thing.",
          zh: "唯一捕捉光线的表面，也是唯一投下阴影的表面——一枚悬浮在所处之物上方的透镜，光线自正上方落下。透明的填充把下方的一切虚化，正面保持平坦，边框色的发丝细边环绕一周：顶边被照亮，底边在光线离开处再次被照亮，两侧的光则消失。底边内侧一像素的亮带是那道光反射回来的结果，整体下方是 Button 的阴影。",
        })}
      </ShowcaseHelper>

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
            css={[glassSurface.base, corner.squircle_round, styles.heroPill]}
          >
            {t({ en: "Change", zh: "更改" })}
          </span>
        </BusyGround>
      </Specimen>

      <div css={styles.anatomy}>
        <Specimen
          caption={t({
            en: "The parts of a glass surface",
            zh: "玻璃表面的组成部分",
          })}
        >
          <BusyGround css={styles.anatomyGround}>
            <div css={[glassSurface.base, corner.radius_4, styles.floating]} />
          </BusyGround>
        </Specimen>
        <dl css={styles.parts}>
          <Part name={t({ en: "Fill", zh: "填充" })} token="color.glassFill">
            {t({
              en: "The see-through body, over the element's own blurred background.",
              zh: "透明的主体，覆盖在元素自身被虚化的背景之上。",
            })}
          </Part>
          <Part name={t({ en: "Blur", zh: "虚化" })} token="blur(8px)">
            {t({
              en: "The element's own background. That is what keeps Glass apart from a Progressive blur, which belongs to the page.",
              zh: "元素自身的背景。这正是玻璃与渐进虚化的区别所在，后者属于页面。",
            })}
          </Part>
          <Part name={t({ en: "Rim", zh: "细边" })} token="color.glassBorder">
            {t({
              en: "A hairline in the border colour, all the way round. A dark edge against a light page, clear against a dark one.",
              zh: "边框色的一圈发丝细边。在浅色页面上是一道暗边，在深色页面上则是透明的。",
            })}
          </Part>
          <Part
            name={t({ en: "Light", zh: "光" })}
            token="color.glassHighlight"
          >
            {t({
              en: "Full along the top edge, gone down the sides, back along the bottom where the light leaves — plus the one-pixel band inside that edge where it bounces back.",
              zh: "顶边最强，两侧消失，在光线离开的底边再次出现——还有底边内侧一像素的亮带，那是它反射回来的部分。",
            })}
          </Part>
          <Part name={t({ en: "Shadow", zh: "阴影" })} token="shadow._2">
            {t({
              en: "The Button's shadow, beneath the glass. The one shadow the system casts.",
              zh: "玻璃下方的 Button 阴影。系统投下的唯一阴影。",
            })}
          </Part>
        </dl>
      </div>

      <Specimen
        caption={t({
          en: "The blur, turned — the same fill over the same ground",
          zh: "调节虚化——同样的填充落在同样的底面上",
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
            <span css={styles.lensLabel}>blur 0px</span>
          </div>
          <div css={[glassSurface.base, corner.radius_4, styles.lens]}>
            <span css={styles.lensLabel}>blur 8px</span>
          </div>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.blur_24,
            ]}
          >
            <span css={styles.lensLabel}>blur 24px</span>
          </div>
        </BusyGround>
      </Specimen>

      <Specimen
        caption={t({
          en: "The fill, turned — how see-through the glass is, and what colour it carries",
          zh: "调节填充——玻璃有多透，以及它带着什么颜色",
        })}
      >
        <BusyGround>
          <div css={[glassSurface.base, corner.radius_4, styles.lens]}>
            <span css={styles.lensLabel}>color.glassFill</span>
          </div>
          <div
            css={[
              glassSurface.base,
              corner.radius_4,
              styles.lens,
              styles.halfFill,
            ]}
          >
            <span css={styles.lensLabel}>
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
            <span css={styles.lensLabel}>color.surfaceAccentMuted</span>
          </div>
        </BusyGround>
      </Specimen>

      <div css={styles.dialGrid}>
        <SpecCard token="glassTokens.fill" meta="default: color.glassFill">
          <Text look="caption" tone="muted">
            {t({
              en: "The see-through body, over the element's own blur. Its alpha is how see-through the glass is; its hue is the colour the glass carries.",
              zh: "透明的主体，覆盖在元素自身的虚化之上。它的透明度决定玻璃有多透，它的色相决定玻璃带着什么颜色。",
            })}
          </Text>
        </SpecCard>
        <SpecCard token="glassTokens.border" meta="default: color.glassBorder">
          <Text look="caption" tone="muted">
            {t({
              en: "The hairline rim's colour, all the way round.",
              zh: "细边的颜色，环绕一周。",
            })}
          </Text>
        </SpecCard>
        <SpecCard
          token="glassTokens.highlight"
          meta="default: color.glassHighlight"
        >
          <Text look="caption" tone="muted">
            {t({
              en: "The light on the rim, and the band where it bounces back near the bottom edge.",
              zh: "细边上的光，以及在底边附近反弹回来的那道亮带。",
            })}
          </Text>
        </SpecCard>
        <SpecCard token="glassTokens.blur" meta="default: 8px">
          <Text look="caption" tone="muted">
            {t({
              en: "The element's own blur — 0px where the ground beneath it is already opaque.",
              zh: "元素自身的虚化——若下方的底面已经不透明，则为 0px。",
            })}
          </Text>
        </SpecCard>
      </div>

      <UsageSnippet
        code={`import {
  glassSurface,
  glassTokens,
} from "@tuja/ui/components/glass-surface.stylex";

<div css={[glassSurface.base, corner.radius_4, styles.lens]}>…</div>

const styles = stylex.create({
  lens: {
    position: "relative",
    [glassTokens.fill]: color.surfaceAccentMuted,
    [glassTokens.blur]: "24px",
  },
});`}
      />

      <Specimen
        caption={t({
          en: "The selected segment is glass sliding over the track",
          zh: "选中的分段是在轨道上滑动的玻璃",
        })}
      >
        <GlassSegmentsSpecimen />
      </Specimen>
    </Showcase>
  );
}

const styles = stylex.create({
  ground: {
    [washTokens.tone]: color.surfaceAccentMuted,
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
    borderColor: color.neutralBorder,
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
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
  },
  stack: {
    position: "relative",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: space._3,
    maxInlineSize: "100%",
  },
  heroCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._00,
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
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  anatomy: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    alignItems: "start",
    gap: space._3,
  },
  anatomyGround: {
    minBlockSize: "220px",
  },
  dialGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  floating: {
    position: "relative",
    inlineSize: "13rem",
    maxInlineSize: "100%",
    blockSize: "116px",
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
    fontSize: font.uiCaption,
    color: color.textMain,
  },
  blur_0: {
    [glassTokens.blur]: "0px",
  },
  blur_24: {
    [glassTokens.blur]: "24px",
  },
  halfFill: {
    [glassTokens.fill]: `color-mix(in srgb, ${color.glassFill} 50%, transparent)`,
  },
  accentFill: {
    [glassTokens.fill]: color.surfaceAccentMuted,
  },
  parts: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    margin: 0,
  },
  part: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  partName: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  partBody: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    margin: 0,
    minInlineSize: 0,
  },
  partToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
});
