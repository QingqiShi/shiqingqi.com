"use client";

import * as stylex from "@stylexjs/stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import {
  border,
  color,
  controlSize,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
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
      <div css={styles.bandRow}>
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

export function LayoutShowcase() {
  // Control-size ramp: each square is drawn at its token, which itself shrinks at
  // the md breakpoint — so the whole ramp steps down live as the window widens.
  const controls = [
    { token: "controlSize._0", meta: "2.4 → 2px", swatch: styles.cs0 },
    { token: "controlSize._1", meta: "4.8 → 4px", swatch: styles.cs1 },
    { token: "controlSize._2", meta: "9.6 → 8px", swatch: styles.cs2 },
    { token: "controlSize._3", meta: "14.4 → 12px", swatch: styles.cs3 },
    { token: "controlSize._4", meta: "19.2 → 16px", swatch: styles.cs4 },
    { token: "controlSize._5", meta: "24 → 20px", swatch: styles.cs5 },
    { token: "controlSize._6", meta: "28.8 → 24px", swatch: styles.cs6 },
    { token: "controlSize._7", meta: "33.6 → 28px", swatch: styles.cs7 },
    { token: "controlSize._8", meta: "38.4 → 32px", swatch: styles.cs8 },
    { token: "controlSize._9", meta: "48 → 40px", swatch: styles.cs9 },
    { token: "controlSize._10", meta: "57.6 → 48px", swatch: styles.cs10 },
  ];
  const layers = [
    { name: "background", value: "-100", z: styles.lzBackground },
    { name: "base", value: "0", z: styles.lzBase },
    { name: "content", value: "100", z: styles.lzContent },
    { name: "overlay", value: "200", z: styles.lzOverlay },
    { name: "header", value: "300", z: styles.lzHeader },
    { name: "tooltip", value: "400", z: styles.lzTooltip },
    { name: "toaster", value: "500", z: styles.lzToaster },
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
            en: "layout.maxInlineSize caps the page at 1140px and centres it, so line length stays readable and gutters open up on wide screens.",
            zh: "layout.maxInlineSize 将页面上限设为 1140px 并居中，使行长保持易读，并在宽屏上留出留白。",
          })}
        </ShowcaseHelper>
        <div css={styles.viewport}>
          <span css={styles.gutterLabel}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
          <div css={styles.contentBand}>
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

      <Showcase label={t({ en: "Control size", zh: "控件尺寸" })}>
        <ShowcaseHelper>
          {t({
            en: "The dimension ramp for controls — heights, paddings, icon boxes. Every step renders larger on touch viewports and shrinks at the md breakpoint, so tap targets stay comfortable on phones.",
            zh: "控件的尺寸阶梯——高度、内边距、图标盒。每一级在触摸视口上更大，并在 md 断点收缩，从而在手机上保持舒适的点按目标。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {controls.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.meta}>
              <div css={styles.csFloor}>
                <span css={[styles.csSwatch, step.swatch]} />
              </div>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Layers", zh: "层级" })}>
        <ShowcaseHelper>
          {t({
            en: "A named z-index scale, so stacking order is a token, not a magic number. Each plane sits above the one below — content over base, overlays over content, toasts over everything.",
            zh: "一套具名的 z-index 阶梯，让层叠顺序成为令牌而非魔法数字。每个平面都压在下一个之上——内容盖过基底、覆盖层盖过内容、提示条盖过一切。",
          })}
        </ShowcaseHelper>
        <div css={[scrollX.base, styles.layerScroll]}>
          <div css={styles.layerStack}>
            {layers.map((plane, index) => (
              <div
                key={plane.name}
                css={[styles.layerCard, plane.z]}
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
                <span css={[styles.ratioSwatch, step.swatch]} />
              </div>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <UsageSnippet
        code={`import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { layout, controlSize, layer, ratio } from "@tuja/ui/tokens.stylex";

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
          <div css={styles.codeTile}>
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
          <div css={styles.codeTile}>
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
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_1,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: space._3,
  },
  csFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "56px",
  },
  csSwatch: {
    borderRadius: border.radius_1,
    backgroundColor: color.accent,
  },
  cs0: { inlineSize: controlSize._0, blockSize: controlSize._0 },
  cs1: { inlineSize: controlSize._1, blockSize: controlSize._1 },
  cs2: { inlineSize: controlSize._2, blockSize: controlSize._2 },
  cs3: { inlineSize: controlSize._3, blockSize: controlSize._3 },
  cs4: { inlineSize: controlSize._4, blockSize: controlSize._4 },
  cs5: { inlineSize: controlSize._5, blockSize: controlSize._5 },
  cs6: { inlineSize: controlSize._6, blockSize: controlSize._6 },
  cs7: { inlineSize: controlSize._7, blockSize: controlSize._7 },
  cs8: { inlineSize: controlSize._8, blockSize: controlSize._8 },
  cs9: { inlineSize: controlSize._9, blockSize: controlSize._9 },
  cs10: { inlineSize: controlSize._10, blockSize: controlSize._10 },
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
    borderRadius: border.radius_2,
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
  lzOverlay: { zIndex: layer.overlay },
  lzHeader: { zIndex: layer.header },
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
    borderRadius: border.radius_1,
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
    borderRadius: border.radius_2,
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
