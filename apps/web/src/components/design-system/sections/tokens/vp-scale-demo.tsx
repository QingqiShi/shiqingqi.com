"use client";

import * as stylex from "@stylexjs/stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { Fragment, useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { centerInScrollX } from "#src/utils/center-in-scroll-x.ts";

// Breakpoint pixel thresholds. These mirror breakpoints.stylex.ts (sm/md/lg);
// declaring them once here lets both the band cutoffs and the threshold labels
// derive from the same numbers, so they can't drift apart within this file.
const SM = 320;
const MD = 768;
const LG = 1080;

const STEPS = [
  { label: "base", min: 0, threshold: `< ${SM.toString()}px`, device: "watch" },
  { label: "sm", min: SM, threshold: `≥ ${SM.toString()}px`, device: "phone" },
  { label: "md", min: MD, threshold: `≥ ${MD.toString()}px`, device: "tablet" },
  { label: "lg", min: LG, threshold: `≥ ${LG.toString()}px`, device: "laptop" },
];

// The rem values at each band, transcribed from the vp* tokens. They can't be
// derived at runtime — getComputedStyle only exposes the ONE band matching the
// live viewport, while the grid shows all four at once. Keep in sync with the
// font.vp* tokens in tokens.stylex.ts if one is retuned.
const ROWS = [
  { token: "font.vpDisplay", sizes: [2, 2.8, 3.75, 5.25], weight: 800 },
  { token: "font.vpSubDisplay", sizes: [1, 1.1, 1.3, 1.6], weight: 500 },
  { token: "font.vpHeading1", sizes: [1.3, 1.4, 1.6, 2], weight: 700 },
  { token: "font.vpHeading2", sizes: [1.2, 1.3, 1.5, 1.8], weight: 700 },
  { token: "font.vpHeading3", sizes: [1, 1.1, 1.2, 1.3], weight: 600 },
];

function bandOf(width: number) {
  return STEPS.findLastIndex((step) => width >= step.min);
}

function DeviceIcon({ device }: { device: string }) {
  switch (device) {
    case "watch":
      return (
        <svg css={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7.5" y="7.5" width="9" height="9" rx="2.5" />
          <path d="M10 7.5V4.5M14 7.5V4.5M10 16.5v3M14 16.5v3" />
        </svg>
      );
    case "phone":
      return (
        <svg css={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2.5" />
          <path d="M10.5 18h3" />
        </svg>
      );
    case "tablet":
      return (
        <svg css={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="3.5" width="16" height="17" rx="2" />
          <path d="M11 17.5h2" />
        </svg>
      );
    default:
      return (
        <svg css={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4.5" width="16" height="10" rx="1" />
          <rect x="2.5" y="16.5" width="19" height="2.5" rx="1.25" />
        </svg>
      );
  }
}

export function ViewportScaleDemo() {
  // documentElement.clientWidth is the layout-viewport width (scrollbar
  // excluded). It matches the media-query width on overlay-scrollbar platforms
  // (macOS, mobile); with classic scrollbars the two can differ by the gutter
  // within a breakpoint of the boundary, so the lit band may briefly lag the
  // real title there.
  const [viewport, setViewport] = useState<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      setViewport(document.documentElement.clientWidth);
    };
    // Coalesce a resize burst into one read + render per frame, matching the
    // container demo's scroll handler.
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

  const band = viewport === undefined ? -1 : bandOf(viewport);

  // Keep the lit column on screen — on a phone the active band sits off the
  // right edge of the scrollable grid otherwise. Re-runs on every viewport
  // change (not just band changes) so an in-band resize re-centres it too.
  // Instant on purpose: this follows layout, it isn't a user gesture.
  useEffect(() => {
    if (viewport === undefined) return;
    const scroll = scrollRef.current;
    const col = colRef.current[band];
    if (!scroll || !col) return;
    centerInScrollX(scroll, col, "auto");
  }, [band, viewport]);

  return (
    <div css={styles.wrap}>
      <div ref={scrollRef} css={[scrollX.base, styles.scroll]}>
        <div css={styles.matrix}>
          <span aria-hidden="true" />
          {STEPS.map((step, c) => {
            const active = c === band;
            return (
              <div
                key={step.label}
                ref={(node) => {
                  colRef.current[c] = node;
                }}
                css={[styles.colHead, active && styles.colHeadActive]}
              >
                <span css={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <DeviceIcon device={step.device} />
                </span>
                <span css={[styles.colBand, active && styles.colBandActive]}>
                  {step.label}
                </span>
                <span css={styles.colThreshold}>{step.threshold}</span>
              </div>
            );
          })}

          {ROWS.map((row) => (
            <Fragment key={row.token}>
              <span css={styles.rowToken}>{row.token}</span>
              {row.sizes.map((size, c) => (
                <div
                  key={STEPS[c].label}
                  css={[styles.cell, c === band && styles.cellActive]}
                >
                  <span
                    css={styles.glyph}
                    style={{
                      fontSize: `${size.toString()}rem`,
                      fontWeight: row.weight,
                    }}
                  >
                    Ag
                  </span>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
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
              <span css={styles.markerBand}>{STEPS[band].label}</span>
            </>
          )}
        </span>
      </p>
    </div>
  );
}

const styles = stylex.create({
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  scroll: {
    touchAction: "pan-x",
    marginInline: `calc(-1 * ${space._1})`,
    paddingInline: space._1,
  },
  matrix: {
    display: "grid",
    gridTemplateColumns: "auto repeat(4, minmax(72px, 1fr))",
    columnGap: space._2,
    rowGap: space._3,
    alignItems: "end",
    minInlineSize: "max-content",
  },
  colHead: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._0,
    paddingBlockEnd: space._1,
    boxShadow: `inset 0 -1px 0 0 ${color.neutralBorder}`,
  },
  colHeadActive: {
    boxShadow: `inset 0 -2px 0 0 ${color.accent}`,
  },
  iconWrap: {
    display: "flex",
    color: color.textSubtle,
    marginBlockEnd: space._0,
  },
  iconWrapActive: {
    color: color.accent,
  },
  icon: {
    inlineSize: "1.5rem",
    blockSize: "1.5rem",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  colBand: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
  colBandActive: {
    color: color.accentText,
  },
  colThreshold: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  rowToken: {
    alignSelf: "center",
    paddingInlineEnd: space._2,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    whiteSpace: "nowrap",
  },
  cell: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBlock: space._1,
    borderRadius: border.radius_1,
  },
  cellActive: {
    backgroundColor: color.surfaceAccentSubtle,
  },
  glyph: {
    lineHeight: font.lineHeight_0,
    color: color.textMain,
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
});
