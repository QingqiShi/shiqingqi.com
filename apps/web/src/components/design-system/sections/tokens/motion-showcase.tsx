"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import * as stylex from "@stylexjs/stylex";
import { Callout } from "@tuja/ui/components/callout";
import { animate, transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

// Duration ledger — the eight steps of `duration.*`, drawn as proportional bars
// so their relative lengths read at a glance (1000ms = full track). Token names
// and millisecond values carry no locale, so this config sits at module scope.
const DURATIONS = [
  { token: "duration._75", ms: 75 },
  { token: "duration._100", ms: 100 },
  { token: "duration._150", ms: 150 },
  { token: "duration._200", ms: 200 },
  { token: "duration._300", ms: 300 },
  { token: "duration._500", ms: 500 },
  { token: "duration._700", ms: 700 },
  { token: "duration._1000", ms: 1000 },
];
const MAX_MS = 1000;

// Easing ledger — each curve plotted from its cubic-bezier control points
// (progress on Y against time on X). The named CSS keywords map to their
// canonical control points; `entrance` is the design system's signature curve.
const EASINGS = [
  { token: "easing.linear", curve: "linear", pts: [0, 0, 1, 1] },
  { token: "easing.ease", curve: "ease", pts: [0.25, 0.1, 0.25, 1] },
  { token: "easing.easeIn", curve: "ease-in", pts: [0.42, 0, 1, 1] },
  { token: "easing.easeOut", curve: "ease-out", pts: [0, 0, 0.58, 1] },
  { token: "easing.easeInOut", curve: "ease-in-out", pts: [0.42, 0, 0.58, 1] },
  {
    token: "easing.entrance",
    curve: "cubic-bezier(0.32, 0.72, 0, 1)",
    pts: [0.32, 0.72, 0, 1],
  },
];

// Maps cubic-bezier control points to an SVG path across a 100×100 box. SVG y
// grows downward, so progress (0→1) is flipped to keep the curve rising.
function easingPath([x1, y1, x2, y2]: number[]) {
  const c1x = (x1 * 100).toFixed(1);
  const c1y = (100 - y1 * 100).toFixed(1);
  const c2x = (x2 * 100).toFixed(1);
  const c2y = (100 - y2 * 100).toFixed(1);
  return `M0,100 C${c1x},${c1y} ${c2x},${c2y} 100,0`;
}

export function MotionShowcase() {
  // A monotonic counter; bumping it remounts every keyed animation node so the
  // one-shot presets replay from their first frame on demand.
  const [tick, setTick] = useState(0);
  const replay = () => {
    setTick((value) => value + 1);
  };

  return (
    <>
      <Showcase label={t({ en: "Duration", zh: "时长" })}>
        <ShowcaseHelper>
          {t({
            en: "Eight steps from a 75ms tap acknowledgement up to a 1000ms full-screen transition. Each bar is drawn in proportion to its length.",
            zh: "从 75 毫秒的轻触反馈到 1000 毫秒的全屏转场，共八级。每条长度与其时长成正比。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {DURATIONS.map((step) => (
            <SpecCard
              key={step.token}
              token={step.token}
              meta={`${step.ms.toString()}ms`}
            >
              <div css={styles.track}>
                <span
                  css={styles.trackFill}
                  style={{
                    inlineSize: `${((step.ms / MAX_MS) * 100).toFixed(1)}%`,
                  }}
                />
              </div>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Easing", zh: "缓动" })}>
        <ShowcaseHelper>
          {t({
            en: "Six timing curves plotting progress against time. entrance is the signature curve — a fast start that decelerates into place — shared by the slide presets.",
            zh: "六条时间曲线，纵轴为进度、横轴为时间。entrance 是标志性曲线——起步迅速、减速落位——被各滑入预设共用。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {EASINGS.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.curve}>
              <svg
                viewBox="0 0 100 100"
                css={styles.curve}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line x1="0" y1="100" x2="100" y2="0" css={styles.curveGuide} />
                <path d={easingPath(step.pts)} css={styles.curvePath} />
              </svg>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Transition presets", zh: "过渡预设" })}>
        <ShowcaseHelper>
          {t({
            en: "Hover a tile to trigger its property change. The preset owns only the timing; the state change is ordinary CSS. Every value settles in 200ms.",
            zh: "将指针悬停在方块上以触发其属性变化。预设只负责时长，状态变化由普通 CSS 承担。每个值均在 200 毫秒内完成。",
          })}
        </ShowcaseHelper>
        <div css={styles.tileGrid}>
          <div css={[styles.demoTile, transition.colors, styles.hoverColors]}>
            transition.colors
          </div>
          <div css={[styles.demoTile, transition.opacity, styles.hoverOpacity]}>
            transition.opacity
          </div>
          <div css={[styles.demoTile, transition.shadow, styles.hoverShadow]}>
            transition.shadow
          </div>
          <div
            css={[styles.demoTile, transition.transform, styles.hoverTransform]}
          >
            transition.transform
          </div>
          <div css={[styles.demoTile, transition.all, styles.hoverAll]}>
            transition.all
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Keyframe animations", zh: "关键帧动画" })}>
        <div css={styles.replayBar}>
          <ShowcaseHelper>
            {t({
              en: "The one-shot presets play on mount; pulse and bounce loop for busy and loading states. Replay to run the one-shots again.",
              zh: "一次性预设在挂载时播放；pulse 与 bounce 用于繁忙与加载状态，循环运行。点击重播可再次播放一次性预设。",
            })}
          </ShowcaseHelper>
          <button type="button" css={styles.replayButton} onClick={replay}>
            <ArrowClockwiseIcon weight="bold" aria-hidden />
            {t({ en: "Replay", zh: "重播" })}
          </button>
        </div>
        <div css={styles.tileGrid}>
          <div key={`fadeIn-${tick.toString()}`} css={styles.animTile}>
            <span css={[styles.animGlyph, animate.fadeIn]} />
            <span css={styles.animLabel}>animate.fadeIn</span>
          </div>
          <div key={`fadeOut-${tick.toString()}`} css={styles.animTile}>
            <span css={[styles.animGlyph, animate.fadeOut]} />
            <span css={styles.animLabel}>animate.fadeOut</span>
          </div>
          <div key={`slideUp-${tick.toString()}`} css={styles.animTile}>
            <div css={styles.slideViewport}>
              <span css={[styles.animGlyph, animate.slideUp]} />
            </div>
            <span css={styles.animLabel}>animate.slideUp</span>
          </div>
          <div key={`slideDown-${tick.toString()}`} css={styles.animTile}>
            <div css={styles.slideViewport}>
              <span css={[styles.animGlyph, animate.slideDown]} />
            </div>
            <span css={styles.animLabel}>animate.slideDown</span>
          </div>
          <div key={`expand-${tick.toString()}`} css={styles.animTile}>
            <div css={animate.expand}>
              <span css={[styles.expandInner, styles.animGlyph]} />
            </div>
            <span css={styles.animLabel}>animate.expand</span>
          </div>
          <div key={`collapse-${tick.toString()}`} css={styles.animTile}>
            <div css={animate.collapse}>
              <span css={[styles.expandInner, styles.animGlyph]} />
            </div>
            <span css={styles.animLabel}>animate.collapse</span>
          </div>
          <div css={styles.animTile}>
            <span css={[styles.animGlyph, animate.pulse]} />
            <span css={styles.animLabel}>animate.pulse</span>
          </div>
          <div css={styles.animTile}>
            <div css={styles.dots}>
              <span css={[styles.dot, animate.bounce]} />
              <span css={[styles.dot, animate.bounce, styles.dotDelay1]} />
              <span css={[styles.dot, animate.bounce, styles.dotDelay2]} />
            </div>
            <span css={styles.animLabel}>animate.bounce</span>
          </div>
        </div>
      </Showcase>

      <Callout
        variant="info"
        title={t({ en: "Reduced motion", zh: "减少动态效果" })}
      >
        {t({
          en: "Every preset ships a prefers-reduced-motion fallback in the base. transition.transform collapses to none, transition.all keeps only colour and opacity, and slideUp/slideDown drop their travel — motion-sensitive users get the state change without the movement, no extra code at the call site.",
          zh: "每个预设都在底层内置了 prefers-reduced-motion 回退。transition.transform 收敛为无动画，transition.all 仅保留颜色与不透明度，slideUp/slideDown 取消位移——对动态敏感的用户能获得状态变化而无需移动，调用处无需额外代码。",
        })}
      </Callout>

      <UsageSnippet
        code={`import { transition, animate } from "@tuja/ui/primitives/motion.stylex";

// Timing on a state change — the preset animates hover/focus/selected.
<button css={[transition.colors, styles.row]}>…</button>

// A keyframe entrance — reduced-motion fallbacks ship in the preset.
<div css={animate.slideUp}>…</div>`}
      />

      <DoDont
        do={
          <div css={[styles.doTile, transition.colors, styles.hoverColors]}>
            {t({ en: "Hover me", zh: "悬停我" })}
          </div>
        }
        doCaption={t({
          en: "Pair a state change with a transition preset so the reduced-motion fallback ships for free.",
          zh: "为状态变化搭配过渡预设，即可免费获得减少动态效果的回退。",
        })}
        dont={
          <div css={styles.dontTile}>
            {t({ en: "transition: all 3s", zh: "transition: all 3s" })}
          </div>
        }
        dontCaption={t({
          en: "Don't hand-roll long, unbounded transitions on transform — they ignore the reduced-motion guard the presets bake in.",
          zh: "不要手写作用于 transform 的过长、无界过渡——它们会绕过预设内置的减少动态效果保护。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: space._3,
  },
  track: {
    blockSize: space._1,
    borderRadius: border.radius_round,
    backgroundColor: color.bgInteractivePressed,
    overflow: "hidden",
  },
  trackFill: {
    display: "block",
    blockSize: "100%",
    borderRadius: border.radius_round,
    backgroundColor: color.accent,
  },
  curve: {
    inlineSize: "100%",
    blockSize: "72px",
    overflow: "visible",
  },
  curveGuide: {
    stroke: color.neutralBorder,
    strokeWidth: 1,
    strokeDasharray: "3 4",
    vectorEffect: "non-scaling-stroke",
  },
  curvePath: {
    fill: "none",
    stroke: color.accent,
    strokeWidth: 2,
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke",
  },
  tileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
    gap: space._2,
  },
  demoTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "72px",
    paddingBlock: space._2,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    color: color.textMuted,
  },
  hoverColors: {
    backgroundColor: {
      default: color.bgSurfaceRaised,
      ":hover": color.accent,
    },
    color: { default: color.textMuted, ":hover": color.accentOn },
  },
  hoverOpacity: {
    opacity: { default: 1, ":hover": 0.35 },
  },
  hoverShadow: {
    boxShadow: {
      default: `inset 0 0 0 1px ${color.neutralBorder}`,
      ":hover": shadow._4,
    },
  },
  hoverTransform: {
    transform: { default: "scale(1)", ":hover": "scale(1.08)" },
  },
  hoverAll: {
    backgroundColor: {
      default: color.bgSurfaceRaised,
      ":hover": color.accentGlow,
    },
    transform: { default: "translateY(0)", ":hover": "translateY(-4px)" },
    color: { default: color.textMuted, ":hover": color.accentText },
  },
  replayBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  replayButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgInteractiveRest,
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    cursor: "pointer",
    flexShrink: 0,
  },
  animTile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    minBlockSize: "96px",
    paddingBlock: space._3,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  animGlyph: {
    inlineSize: space._7,
    blockSize: space._7,
    borderRadius: border.radius_2,
    backgroundColor: color.accent,
  },
  slideViewport: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._7,
    blockSize: space._7,
    overflow: "hidden",
    borderRadius: border.radius_2,
  },
  expandInner: {
    inlineSize: space._7,
    minBlockSize: 0,
    overflow: "hidden",
  },
  animLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    textAlign: "center",
  },
  dots: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    blockSize: space._7,
  },
  dot: {
    inlineSize: space._2,
    blockSize: space._2,
    borderRadius: border.radius_round,
    backgroundColor: color.accent,
  },
  dotDelay1: {
    animationDelay: "0.16s",
  },
  dotDelay2: {
    animationDelay: "0.32s",
  },
  doTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "56px",
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    cursor: "pointer",
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.accent,
    },
    color: { default: color.textMain, ":hover": color.accentOn },
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  dontTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "56px",
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: border.radius_2,
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
});
