"use client";

import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

// Breakpoint thresholds, transcribed once from breakpoints.stylex.ts so the band
// cutoffs and the labels can't drift within this file. `xl` gates the widest
// desktops; below `sm` is the shared mobile base.
const BANDS = [
  { label: "base", min: 0, threshold: "< 320" },
  { label: "sm", min: 320, threshold: "≥ 320" },
  { label: "md", min: 768, threshold: "≥ 768" },
  { label: "lg", min: 1080, threshold: "≥ 1080" },
  { label: "xl", min: 2000, threshold: "≥ 2000" },
];

function bandOf(width: number) {
  return BANDS.findLastIndex((band) => width >= band.min);
}

function BreakpointBands() {
  // clientWidth is the layout-viewport width (scrollbar excluded), matching the
  // media-query width on overlay-scrollbar platforms.
  const [viewport, setViewport] = useState<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      setViewport(document.documentElement.clientWidth);
    };
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  const active = viewport === undefined ? -1 : bandOf(viewport);

  return (
    <div css={styles.bandWrap}>
      <div css={[corner.radius_2, styles.bandRow]}>
        {BANDS.map((band, index) => {
          const isActive = index === active;
          return (
            <div
              key={band.label}
              css={[styles.band, isActive && styles.bandActive]}
            >
              <span
                css={[styles.bandLabel, isActive && styles.bandLabelActive]}
              >
                {band.label}
              </span>
              <span css={styles.bandThreshold}>{band.threshold}</span>
            </div>
          );
        })}
      </div>
      <p css={styles.marker} aria-live="polite">
        <span css={styles.markerLabel}>
          {t({ en: "your window", zh: "你的窗口" })}
        </span>
        <span css={styles.markerValue}>
          {viewport === undefined ? (
            " "
          ) : (
            <>
              {`${viewport.toString()}px → `}
              <span css={styles.markerBand}>{BANDS[active].label}</span>
            </>
          )}
        </span>
      </p>
    </div>
  );
}

/**
 * Two pages drawn to the same scale, each holding the same 41em paragraph:
 * one capped so the leftover reads as a margin, one wide enough that it reads
 * as a column with nothing in it.
 */
function MeasureBands() {
  return (
    <div css={styles.measureRows}>
      <div css={styles.measureRow}>
        <div css={[corner.radius_2, styles.measurePage]}>
          <div
            css={[
              corner.radius_1,
              styles.measureProse,
              styles.measureProseNarrow,
            ]}
          >
            <span css={styles.measureProseLabel}>prose 41em</span>
          </div>
          <span css={styles.measureRest}>
            {t({ en: "margin", zh: "页边" })}
          </span>
        </div>
        <span css={styles.measureCaption}>
          {t({
            en: "A 48rem page. What is left beside the paragraph is a margin.",
            zh: "48rem 的页面。段落旁边剩下的是页边。",
          })}
        </span>
      </div>
      <div css={styles.measureRow}>
        <div css={[corner.radius_2, styles.measurePage]}>
          <div
            css={[
              corner.radius_1,
              styles.measureProse,
              styles.measureProseWide,
            ]}
          >
            <span css={styles.measureProseLabel}>prose 41em</span>
          </div>
          <span
            css={[styles.measureRest, corner.radius_1, styles.measureRestEmpty]}
          >
            {t({ en: "empty column", zh: "空栏" })}
          </span>
        </div>
        <span css={styles.measureCaption}>
          {t({
            en: "A 1140px page. The same paragraph, and the gap beside it now reads as a column with something missing.",
            zh: "1140px 的页面。同样的段落，旁边的空隙此时读起来像一列缺了内容的栏。",
          })}
        </span>
      </div>
    </div>
  );
}

export function LayoutShowcase() {
  const layers = [
    { name: "background", value: "-100", z: styles.lzBackground },
    { name: "base", value: "0", z: styles.lzBase },
    { name: "content", value: "100", z: styles.lzContent },
    { name: "raised", value: "200", z: styles.lzRaised },
    { name: "header", value: "300", z: styles.lzHeader },
    { name: "overlay", value: "400", z: styles.lzOverlay },
    { name: "tooltip", value: "500", z: styles.lzTooltip },
    { name: "toaster", value: "600", z: styles.lzToaster },
  ];
  const ratios = [
    { token: "ratio.square", meta: "1/1", swatch: styles.arSquare },
    { token: "ratio.golden", meta: "1.618/1", swatch: styles.arGolden },
    { token: "ratio.tv", meta: "4/3", swatch: styles.arTv },
    { token: "ratio.double", meta: "2/1", swatch: styles.arDouble },
    { token: "ratio.wide", meta: "16/9", swatch: styles.arWide },
    { token: "ratio.poster", meta: "2/3", swatch: styles.arPoster },
    { token: "ratio.portrait", meta: "3/4", swatch: styles.arPortrait },
  ];

  return (
    <>
      <Showcase label={t({ en: "Breakpoints", zh: "断点" })}>
        <ShowcaseHelper>
          {t({
            en: "Four min-width thresholds over a shared mobile base. The band matching your window lights up — resize to walk the ladder.",
            zh: "在共享的移动端基线之上设有四个最小宽度阈值。与当前窗口匹配的区间会点亮——调整窗口大小即可逐级查看。",
          })}
        </ShowcaseHelper>
        <BreakpointBands />
      </Showcase>

      <Showcase label={t({ en: "Content width", zh: "内容宽度" })}>
        <ShowcaseHelper>
          {t({
            en: "layout.maxInlineSize caps the page at 1140px and centres it, so gutters open up on wide screens. It bounds the page; the measure below bounds the text inside it.",
            zh: "layout.maxInlineSize 将页面上限设为 1140px 并居中，使宽屏上留出留白。它约束的是页面，下面的行长约束的是页面里的文字。",
          })}
        </ShowcaseHelper>
        <div css={[corner.radius_2, styles.viewport]}>
          <span css={styles.gutterLabel}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
          <div css={[corner.radius_1, styles.contentBand]}>
            <span css={styles.contentLabel}>
              {t({ en: "content", zh: "内容" })}
            </span>
            <span css={styles.contentToken}>max 1140px</span>
          </div>
          <span css={styles.gutterLabel}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Measure", zh: "行长" })}>
        <ShowcaseHelper>
          {t({
            en: "Prose caps at 41em: 41 Chinese characters at any type size, around 88 Latin. The unit is em so the cap tracks its own text — a rem cap holds the width still instead, and small print then runs longer than body copy.",
            zh: "正文行长上限为 41em：在任何字号下都是 41 个汉字，约 88 个拉丁字符。单位用 em，上限才会随文字大小变化——rem 上限固定的是宽度，小字于是会比正文排得更长。",
          })}
        </ShowcaseHelper>
        <MeasureBands />
        <ShowcaseHelper>
          {t({
            en: "The cap exists because the eye has to jump back to the start of the next line, and the longer that jump, the more often it lands on the wrong one. A wide screen is not a reason to set text wider, or bigger. Either put something beside the paragraph, or cap the page so what is left beside it stays a margin. Design-system pages take the second route at 48rem, and a specimen that needs more room scrolls inside its own card.",
            zh: "设这个上限，是因为读到行尾时眼睛要跳回下一行的开头；这一跳越长，落错行的次数就越多。屏幕宽，不是把文字排得更宽或更大的理由。要么在段落旁边放点别的东西，要么把页面收窄，让段落旁边剩下的只是页边。设计系统页面走的是后一条路，宽度为 48rem；放不下的示例则在自己的卡片内横向滚动。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Layers", zh: "层级" })}>
        <ShowcaseHelper>
          {t({
            en: "A named z-index scale, so stacking order is a token, not a magic number. Each plane sits above the one below — a menu or sticky bar raised over scrolling content, headers over that, an open overlay over the app chrome, toasts over everything.",
            zh: "一套具名的 z-index 阶梯，让层叠顺序成为令牌而非魔法数字。每个平面都压在下一个之上——菜单或吸顶栏抬升于滚动内容之上、页头再压过它们、打开的覆盖层盖过应用框架、提示条盖过一切。",
          })}
        </ShowcaseHelper>
        <div css={[scrollX.base, styles.layerScroll]}>
          <div css={styles.layerStack}>
            {layers.map((plane, index) => (
              <div
                key={plane.name}
                css={[corner.radius_2, styles.layerCard, plane.z]}
                style={{
                  transform: `translateX(${(index * 18).toString()}px)`,
                }}
              >
                <span css={styles.layerName}>layer.{plane.name}</span>
                <span css={styles.layerValue}>{plane.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Aspect ratios", zh: "宽高比" })}>
        <ShowcaseHelper>
          {t({
            en: "Named ratios for media frames — posters, thumbnails, hero bands — drawn as real aspect-ratio boxes so a placeholder holds its shape before the image loads.",
            zh: "用于媒体框的具名比例——海报、缩略图、主视觉条——以真实的 aspect-ratio 方框绘制，使占位符在图片加载前就保持其形状。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {ratios.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.meta}>
              <div css={styles.ratioFloor}>
                <span
                  css={[corner.radius_1, styles.ratioSwatch, step.swatch]}
                />
              </div>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <UsageSnippet
        code={`import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { layout, layer, ratio } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  page: { maxInlineSize: layout.maxInlineSize, marginInline: "auto" },
  // Mobile-first: base value, then override up at each breakpoint.
  grid: {
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
  },
  poster: { aspectRatio: ratio.poster },
  toast: { zIndex: layer.toaster },
});`}
      />

      <DoDont
        do={
          <div css={[corner.radius_2, styles.codeTile]}>
            <span css={styles.codeMuted}>gridTemplateColumns:</span>
            <span css={styles.codeLine}>
              {'{ default: "1fr", [breakpoints.md]: "1fr 1fr" }'}
            </span>
          </div>
        }
        doCaption={t({
          en: "Write mobile-first: a base value, then min-width overrides that add columns as space appears.",
          zh: "以移动端优先：先写基础值，再用最小宽度覆盖，随着空间出现增加列数。",
        })}
        dont={
          <div css={[corner.radius_2, styles.codeTile]}>
            <span css={styles.codeMuted}>@media (max-width: 767px)</span>
            <span css={styles.codeLine}>
              {t({ en: "override desktop back down", zh: "把桌面端往回覆盖" })}
            </span>
          </div>
        }
        dontCaption={t({
          en: "Don't design desktop-first with max-width queries — it fights the token system's min-width breakpoints.",
          zh: "不要以桌面端优先、用 max-width 查询——这会与令牌系统的最小宽度断点相冲突。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  bandWrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  bandRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: space._00,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    backgroundColor: color.bgCanvas,
  },
  band: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._0,
    paddingBlock: space._2,
    paddingInline: space._1,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 -2px 0 0 transparent`,
  },
  bandActive: {
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 -2px 0 0 ${color.accent}`,
  },
  bandLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
  bandLabelActive: {
    color: color.accentText,
  },
  bandThreshold: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  marker: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  markerLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
    color: color.textSubtle,
  },
  markerValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    fontVariantNumeric: "tabular-nums",
  },
  markerBand: {
    color: color.accentText,
    fontWeight: font.weight_6,
  },
  // Content-width schematic: a full-width "viewport" with a centred content band
  // and labelled gutters. Illustrative — the true cap is 1140px.
  viewport: {
    display: "flex",
    alignItems: "stretch",
    gap: space._1,
    padding: space._1,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  gutterLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._8,
    flexShrink: 0,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    textAlign: "center",
  },
  contentBand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._00,
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._5,
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  contentLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentText,
  },
  contentToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMuted,
  },
  measureRows: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  measureRow: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  // Both pages are drawn at the same width, so the prose bands inside them are
  // to scale against each other: 41/48 against 656/1140.
  measurePage: {
    display: "flex",
    alignItems: "stretch",
    gap: space._00,
    padding: space._1,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  measureProse: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    paddingBlock: space._4,
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  measureProseNarrow: { inlineSize: "85.4%" },
  measureProseWide: { inlineSize: "57.5%" },
  measureProseLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.accentText,
  },
  measureRest: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    minInlineSize: 0,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    textAlign: "center",
  },
  // The wide page's leftover is drawn as a slot rather than as space: it is big
  // enough to hold something, which is why it reads as missing content.
  measureRestEmpty: {
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.neutralBorder,
  },
  measureCaption: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_4,
    color: color.textSubtle,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: space._3,
  },
  layerScroll: {
    marginInline: `calc(-1 * ${space._1})`,
    paddingInline: space._1,
  },
  layerStack: {
    display: "flex",
    flexDirection: "column",
    paddingBlock: space._2,
    paddingInlineEnd: space._9,
    minInlineSize: "max-content",
    // Contain the z-index scale in its own stacking context so the negative
    // `background` layer paints above the section surface, not behind it.
    isolation: "isolate",
  },
  layerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._4,
    inlineSize: "180px",
    paddingBlock: space._2,
    paddingInline: space._3,
    marginBlockStart: `calc(-1 * ${space._1})`,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
  },
  layerName: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  layerValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.accentText,
    fontVariantNumeric: "tabular-nums",
  },
  lzBackground: { zIndex: layer.background, marginBlockStart: 0 },
  lzBase: { zIndex: layer.base },
  lzContent: { zIndex: layer.content },
  lzRaised: { zIndex: layer.raised },
  lzHeader: { zIndex: layer.header },
  lzOverlay: { zIndex: layer.overlay },
  lzTooltip: { zIndex: layer.tooltip },
  lzToaster: { zIndex: layer.toaster },
  ratioFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "88px",
  },
  ratioSwatch: {
    inlineSize: "100%",
    maxInlineSize: "112px",
    maxBlockSize: "88px",
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  arSquare: { aspectRatio: "1" },
  arGolden: { aspectRatio: "1.618/1" },
  arTv: { aspectRatio: "4/3" },
  arDouble: { aspectRatio: "2/1" },
  arWide: { aspectRatio: "16/9" },
  arPoster: { aspectRatio: "2/3" },
  arPortrait: { aspectRatio: "3/4" },
  codeTile: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  codeMuted: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  codeLine: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
