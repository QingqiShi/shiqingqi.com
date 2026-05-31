"use client";

import * as stylex from "@stylexjs/stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import {
  centerInScrollX,
  offsetFromScrollCenterX,
} from "#src/utils/center-in-scroll-x.ts";
import { getScrollBehavior } from "#src/utils/get-scroll-behavior.ts";

// font.cqTitle's container formula, expanded into its parts so the ruler can
// derive its own saturation points instead of restating magic numbers. Inside
// the clamp band the size grows BASE rem + SLOPE · cqi.
//
// Two deliberate departures from the real token, both to keep the demo honest:
//   • The real token pins to a fixed 1.5rem above the lg breakpoint, which would
//     freeze this demo on wide screens — dropped here.
//   • The real token uses cqmin (the smaller of the inline/block container
//     axes). These cards only contain the inline axis, so on a short viewport
//     cqmin would start tracking viewport height and the title would slip below
//     its labelled ceiling. cqi tracks the card's width alone — what the ruler
//     actually claims to show.
const CLAMP_MIN_REM = 1.1;
const CLAMP_MAX_REM = 1.4;
const CLAMP_BASE_REM = 0.96;
const CLAMP_SLOPE = 1.56;
const REM_PX = 16;
const CQ_TITLE_CLAMP = `clamp(${CLAMP_MIN_REM.toString()}rem, ${CLAMP_BASE_REM.toString()}rem + ${CLAMP_SLOPE.toString()}cqi, ${CLAMP_MAX_REM.toString()}rem)`;

// Container width (px) at which the clamp output equals `rem`, solving
// rem·REM_PX = BASE·REM_PX + SLOPE·(width / 100). Below FLOOR_PX the title pins
// to its floor, above CEIL_PX to its ceiling; the ruler's domain is between.
function widthForRem(rem: number) {
  return Math.round(((rem - CLAMP_BASE_REM) * REM_PX * 100) / CLAMP_SLOPE);
}

const FLOOR_PX = widthForRem(CLAMP_MIN_REM);
const CEIL_PX = widthForRem(CLAMP_MAX_REM);

// Four real fixed-width containers. The narrowest sits just above the floor;
// the widest lands exactly on the ceiling (the max rem shown at full size). The
// browser's own engine sizes each title — we only read the result back.
const CARD_WIDTHS = [160, 240, 360, CEIL_PX];

function toPercent(px: number) {
  const ratio = (px - FLOOR_PX) / (CEIL_PX - FLOOR_PX);
  return Math.min(100, Math.max(0, ratio * 100));
}

// Keep the needle's label inside the ruler when it hugs an edge.
function labelAnchor(percent: number) {
  if (percent <= 15) return "translateX(0)";
  if (percent >= 85) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function ContainerScaleDemo() {
  const railRef = useRef<HTMLUListElement>(null);
  const cardElementsRef = useRef<Array<HTMLLIElement | null>>([]);
  const titleElementsRef = useRef<Array<HTMLParagraphElement | null>>([]);
  const [rems, setRems] = useState<Array<number | undefined>>([]);
  // The inline space available to a container here — the rail's own client
  // width, not the device screen. Bounds how wide a card can get in this layout.
  const [availWidth, setAvailWidth] = useState<number | undefined>(undefined);
  const [active, setActive] = useState(0);
  // While a slider-initiated scroll settles, ignore scroll-driven active
  // updates — otherwise on wide rails the centre-nearest card overrides the
  // card the slider just picked.
  const lockRef = useRef(false);
  const lockTimerRef = useRef(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let frame = 0;

    const measure = () => {
      const root = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      setRems(
        titleElementsRef.current.map((title) => {
          if (!title) return undefined;
          const px = Number.parseFloat(getComputedStyle(title).fontSize);
          return Math.round((px / root) * 100) / 100;
        }),
      );
      setAvailWidth(Math.round(rail.clientWidth));
    };

    const syncActive = () => {
      if (lockRef.current) return;
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      cardElementsRef.current.forEach((card, i) => {
        if (!card) return;
        const distance = Math.abs(offsetFromScrollCenterX(rail, card));
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setActive(nearest);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncActive);
    };

    measure();
    rail.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(lockTimerRef.current);
    };
  }, []);

  const scrollToCard = (index: number) => {
    const rail = railRef.current;
    const card = cardElementsRef.current[index];
    if (!rail || !card) return;
    lockRef.current = true;
    window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
    }, 500);
    // User gesture (slider) — animate unless reduced-motion is set.
    centerInScrollX(rail, card, getScrollBehavior());
  };

  const handleSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setActive(next);
    scrollToCard(next);
  };

  const specimen = t({ en: "Container title", zh: "容器标题" });
  const measuredWord = t({ en: "Measured", zh: "实测" });
  const availWord = t({ en: "available width", zh: "可用宽度" });
  const floorWord = t({ en: "floor", zh: "下限" });
  const ceilingWord = t({ en: "ceiling", zh: "上限" });

  const activeRem = rems[active];
  const activeWidthText = `${CARD_WIDTHS[active].toString()}px`;
  const activeRemText =
    activeRem === undefined ? undefined : `${activeRem.toFixed(2)}rem`;
  const liveValue =
    activeRemText === undefined ? " " : `${activeWidthText} → ${activeRemText}`;

  const fits = availWidth !== undefined && availWidth >= CEIL_PX;
  const needlePercent = availWidth === undefined ? 0 : toPercent(availWidth);

  return (
    <div css={styles.wrap}>
      <ul
        ref={railRef}
        css={[scrollX.base, styles.rail]}
        aria-label={t({
          en: "Container-width comparison cards",
          zh: "容器宽度对比卡片",
        })}
      >
        {CARD_WIDTHS.map((width, i) => {
          const rem = rems[i];
          const isActive = i === active;
          return (
            <li
              key={width}
              ref={(node) => {
                cardElementsRef.current[i] = node;
              }}
              css={[styles.card, isActive && styles.cardActive]}
              style={{ inlineSize: `${width.toString()}px` }}
              aria-current={isActive ? "true" : undefined}
            >
              <div css={styles.cardInner}>
                <span css={styles.eyebrow}>{width}px</span>
                <p
                  ref={(node) => {
                    titleElementsRef.current[i] = node;
                  }}
                  css={styles.specimen}
                  style={{ fontSize: CQ_TITLE_CLAMP }}
                >
                  {specimen}
                </p>
                <span css={[styles.readout, isActive && styles.readoutActive]}>
                  {rem === undefined ? "→ …" : `→ ${rem.toFixed(2)}rem`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div css={styles.controls}>
        <p css={styles.live} aria-live="polite">
          <span css={styles.liveLabel}>{measuredWord}</span>
          <span css={styles.liveValue}>{liveValue}</span>
        </p>
        <input
          type="range"
          min={0}
          max={CARD_WIDTHS.length - 1}
          step={1}
          value={active}
          onChange={handleSlider}
          css={styles.slider}
          aria-label={t({
            en: "Step through container widths",
            zh: "逐级切换容器宽度",
          })}
          aria-valuetext={
            activeRemText === undefined
              ? activeWidthText
              : `${activeWidthText}, ${activeRemText}`
          }
        />
      </div>

      <div css={styles.ruler}>
        <div css={styles.track}>
          <span css={styles.baseline} aria-hidden="true" />
          {availWidth !== undefined && !fits ? (
            <span
              css={styles.offscreen}
              style={{ left: `${needlePercent.toString()}%` }}
              aria-hidden="true"
            />
          ) : null}
          {CARD_WIDTHS.map((width, i) => (
            <span
              key={width}
              css={[styles.notch, i === active && styles.notchActive]}
              style={{ left: `${toPercent(width).toString()}%` }}
              aria-hidden="true"
            />
          ))}
          {availWidth !== undefined ? (
            <span
              css={styles.needle}
              style={{ left: `${needlePercent.toString()}%` }}
              aria-hidden="true"
            >
              <span
                css={styles.needleLabel}
                style={{ transform: labelAnchor(needlePercent) }}
              >
                {`${availWord} ≈${availWidth.toString()}px`}
              </span>
            </span>
          ) : null}
        </div>
        <div css={styles.ends}>
          <span css={styles.end}>
            {`${floorWord} · ${FLOOR_PX.toString()}px → ${CLAMP_MIN_REM.toString()}rem`}
          </span>
          <span css={[styles.end, styles.endRight]}>
            {`${CEIL_PX.toString()}px → ${CLAMP_MAX_REM.toString()}rem · ${ceilingWord}`}
          </span>
        </div>
      </div>

      <p css={styles.lgNote}>
        <span css={styles.lgChip}>≥ lg · 1.5rem</span>
        <span css={styles.lgCopy}>
          {t({
            en: "At the lg breakpoint and up the real token pins to a fixed 1.5rem — it stops tracking the container.",
            zh: "在 lg 断点及以上，真实令牌固定为 1.5rem——不再随容器变化。",
          })}
        </span>
      </p>
    </div>
  );
}

const HAIRLINE = `inset 0 0 0 1px ${color.neutralBorder}`;

const styles = stylex.create({
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
  rail: {
    display: "flex",
    alignItems: "stretch",
    gap: space._3,
    listStyle: "none",
    margin: 0,
    padding: space._1,
    // Let vertical swipes scroll the page; only claim horizontal panning.
    touchAction: "pan-x",
    // Snap is a swipe nicety, not essential motion — drop it under reduced-motion.
    scrollSnapType: {
      default: "x mandatory",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  card: {
    flexShrink: 0,
    containerType: "inline-size",
    scrollSnapAlign: "center",
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: HAIRLINE,
    transition:
      "box-shadow 0.18s ease, background-color 0.18s ease, color 0.18s ease",
  },
  cardActive: {
    // An alpha tint over the panel — keeps text contrast in both themes,
    // unlike bgSurfaceBright which flips to a light surface in dark mode.
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accent}`,
  },
  cardInner: {
    display: "flex",
    flexDirection: "column",
    blockSize: "100%",
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._3,
  },
  eyebrow: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  specimen: {
    margin: 0,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
    letterSpacing: font.trackingSnug,
    color: color.textMain,
    overflowWrap: "break-word",
  },
  readout: {
    marginBlockStart: "auto",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    fontVariantNumeric: "tabular-nums",
  },
  readoutActive: {
    color: color.accentText,
    fontWeight: font.weight_6,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: space._4,
    rowGap: space._2,
  },
  live: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    flexShrink: 0,
  },
  liveLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
    color: color.textSubtle,
  },
  liveValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    fontVariantNumeric: "tabular-nums",
  },
  slider: {
    flexGrow: 1,
    flexBasis: "12rem",
    minInlineSize: 0,
    margin: 0,
    accentColor: color.accent,
    cursor: "pointer",
  },
  ruler: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  track: {
    position: "relative",
    blockSize: "2.25rem",
  },
  baseline: {
    position: "absolute",
    insetInline: 0,
    insetBlockEnd: 0,
    blockSize: border.size_2,
    borderRadius: border.radius_round,
    backgroundColor: color.neutralBorder,
  },
  // Container widths beyond the screen-reach needle — hatched "out of bounds".
  offscreen: {
    position: "absolute",
    insetInlineEnd: 0,
    insetBlockEnd: 0,
    blockSize: space._3,
    opacity: 0.55,
    borderStartStartRadius: border.radius_1,
    borderEndStartRadius: border.radius_1,
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0, transparent 5px, ${color.neutral} 5px, ${color.neutral} 6px)`,
  },
  notch: {
    position: "absolute",
    insetBlockEnd: 0,
    inlineSize: border.size_2,
    blockSize: space._2,
    marginInlineStart: `calc(-1 * ${border.size_1})`,
    borderRadius: border.radius_round,
    backgroundColor: color.neutral,
    transition: "background-color 0.18s ease, block-size 0.18s ease",
  },
  notchActive: {
    blockSize: space._3,
    backgroundColor: color.accent,
  },
  needle: {
    position: "absolute",
    insetBlockEnd: 0,
    blockSize: "100%",
    inlineSize: border.size_2,
    marginInlineStart: `calc(-1 * ${border.size_1})`,
    backgroundColor: color.accent,
  },
  needleLabel: {
    position: "absolute",
    insetBlockStart: 0,
    whiteSpace: "nowrap",
    paddingBlock: space._00,
    paddingInline: space._1,
    borderRadius: border.radius_1,
    backgroundColor: color.surfaceAccentSubtle,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    fontVariantNumeric: "tabular-nums",
    color: color.accentText,
  },
  ends: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: space._3,
  },
  end: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  endRight: {
    textAlign: "end",
  },
  lgNote: {
    margin: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: space._2,
    rowGap: space._1,
  },
  lgChip: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._00,
    paddingInline: space._2,
    borderRadius: border.radius_round,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: HAIRLINE,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    whiteSpace: "nowrap",
  },
  lgCopy: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: "16ch",
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
});
