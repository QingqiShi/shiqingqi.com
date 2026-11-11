"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import type { MotionEngine } from "@tuja/ui/motion/create-motion-engine";
import { useBinding } from "@tuja/ui/motion/use-binding";
import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useId, useRef } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import type { MonthBar } from "./build-month-view.ts";
import type { MonthBounds, MonthKey } from "./month-bounds.ts";
import { monthSpring } from "./use-month-slide.ts";
import { wholeMoney } from "./whole-money.ts";

interface MonthStripProps {
  bars: readonly MonthBar[];
  month: MonthKey;
  bounds: MonthBounds;
  currency: string;
  onMonth: (month: MonthKey) => void;
}

const PLOT = "4.5rem";

/** One bar that grows up from the baseline for money left over, or down for money overspent. */
function StripBar({
  engine,
  share,
  baseline,
  isSelected,
}: {
  engine: MotionEngine;
  /** The month's net as a share of the strip's range, from -1 to 1. */
  share: number;
  /** How much of the plot lies above the baseline, 0–1. */
  baseline: number;
  isSelected: boolean;
}) {
  const value = useMotionValue(engine, 0, { precision: 0.001 });
  const upRef = useRef<HTMLSpanElement>(null);
  const downRef = useRef<HTMLSpanElement>(null);
  const hidden = (at: number, room: number) =>
    room <= 0 ? 100 : Math.max(0, 1 - at / room) * 100;
  useBinding(upRef, value, {
    pose: (at) => ({
      transform: `translateY(${hidden(Math.max(at, 0), baseline).toFixed(2)}%)`,
    }),
  });
  useBinding(downRef, value, {
    pose: (at) => ({
      transform: `translateY(${(-hidden(Math.max(-at, 0), 1 - baseline)).toFixed(2)}%)`,
    }),
  });
  useEffect(() => {
    value.to(share, { spring: monthSpring });
  }, [value, share]);

  const fill = [
    corner.radius_round,
    transition.colors,
    styles.bar,
    isSelected ? null : styles.quietBar,
  ];
  return (
    <span css={styles.plot} aria-hidden>
      <span css={[corner.radius_round, styles.track]} />
      <span css={[styles.clip, styles.above(baseline)]}>
        <span ref={upRef} css={[fill, isSelected && styles.selectedUp]} />
      </span>
      <span css={[styles.clip, styles.below(baseline)]}>
        <span
          ref={downRef}
          css={[fill, styles.barDown, isSelected && styles.selectedDown]}
        />
      </span>
      <span css={[styles.baseline, styles.at(baseline)]} />
    </span>
  );
}

/**
 * What was left over in each month of the strip, as bars on one baseline.
 * The picked month's bar fills with colour, and a marker with its amount
 * springs along the strip to it. A bar opens its month.
 */
export function MonthStrip({
  bars,
  month,
  bounds,
  currency,
  onMonth,
}: MonthStripProps) {
  const locale = useLocale();
  const headingId = useId();
  const engine = useMotionEngine();
  const selected = Math.max(
    bars.findIndex((bar) => bar.month === month),
    0,
  );
  const slot = useMotionValue(engine, selected, { precision: 0.001 });
  const markerRef = useRef<HTMLSpanElement>(null);
  useBinding(markerRef, slot, {
    pose: (at) => ({ transform: `translateX(${(at * 100).toFixed(2)}%)` }),
  });
  useEffect(() => {
    slot.to(selected, { spring: monthSpring });
  }, [slot, selected]);

  const up = Math.max(0, ...bars.map((bar) => bar.net));
  const down = Math.max(0, ...bars.map((bar) => -bar.net));
  const range = up + down;
  const baseline = range === 0 ? 1 : up / range;
  const money = (minor: number) => wholeMoney(minor, currency, locale);
  const colon = t({ en: ": ", zh: "：" });
  const noData = t({ en: "nothing recorded", zh: "无记录" });
  const picked = bars[selected];

  return (
    <section css={stack.tight} aria-labelledby={headingId}>
      <Heading level={2} look="h4" id={headingId}>
        {t({ en: "Left over each month", zh: "每月结余" })}
      </Heading>
      <div css={styles.strip}>
        <span
          ref={markerRef}
          aria-hidden
          css={[styles.marker, styles.slotWidth(bars.length)]}
        >
          <span css={[corner.radius_3, styles.markerFill]} />
          <Text
            as="span"
            look="caption"
            weight="semibold"
            numeric
            wrap="nowrap"
            css={styles.markerLabel}
          >
            {money(picked.net)}
          </Text>
        </span>
        {bars.map((bar, at) => {
          const day = `${bar.month}-01`;
          const isSelected = at === selected;
          const isOpen = bar.month >= bounds.first && bar.month <= bounds.last;
          return (
            <button
              key={at}
              type="button"
              aria-pressed={isSelected}
              disabled={!isOpen}
              aria-label={`${displayDay(day, locale, "longMonthYear")}${colon}${
                bar.hasData ? money(bar.net) : noData
              }`}
              onClick={() => {
                onMonth(bar.month);
              }}
              css={[buttonReset.base, corner.radius_3, styles.slot]}
            >
              <StripBar
                engine={engine}
                share={range === 0 ? 0 : bar.net / range}
                baseline={baseline}
                isSelected={isSelected}
              />
              <span aria-hidden css={styles.tick}>
                <Text
                  as="span"
                  look="caption"
                  tone={isSelected ? "default" : "muted"}
                  weight={isSelected ? "bold" : undefined}
                  css={transition.colors}
                >
                  <span css={styles.wideTick}>
                    {displayDay(day, locale, "month")}
                  </span>
                  <span css={styles.narrowTick}>
                    {displayDay(day, locale, "narrowMonth")}
                  </span>
                </Text>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const NARROW = "@container (max-width: 26rem)";

const styles = stylex.create({
  strip: {
    containerType: "inline-size",
    position: "relative",
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(0, 1fr)",
    paddingBlockStart: space._5,
  },
  slotWidth: (count: number) => ({
    inlineSize: `calc(100% / ${String(count)})`,
  }),
  marker: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    pointerEvents: "none",
  },
  markerFill: {
    position: "absolute",
    insetBlockStart: space._5,
    insetBlockEnd: 0,
    insetInline: space._00,
    backgroundColor: color.secondary,
  },
  markerLabel: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
  },
  slot: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlock: space._1,
    color: "inherit",
    cursor: { default: "pointer", ":disabled": "default" },
  },
  plot: {
    position: "relative",
    display: "block",
    inlineSize: "100%",
    blockSize: PLOT,
  },
  track: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: "50%",
    inlineSize: "min(0.75rem, 46%)",
    transform: "translateX(-50%)",
    backgroundColor: color.secondary,
    opacity: 0.5,
  },
  clip: {
    position: "absolute",
    insetInlineStart: "50%",
    inlineSize: "min(0.75rem, 46%)",
    transform: "translateX(-50%)",
    overflow: "hidden",
  },
  above: (baseline: number) => ({
    insetBlockStart: 0,
    blockSize: `${(baseline * 100).toFixed(2)}%`,
  }),
  below: (baseline: number) => ({
    insetBlockEnd: 0,
    blockSize: `${((1 - baseline) * 100).toFixed(2)}%`,
  }),
  bar: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
    transform: "translateY(100%)",
  },
  barDown: {
    transform: "translateY(-100%)",
  },
  quietBar: {
    backgroundColor: `color-mix(in srgb, ${color.mutedForeground} 38%, transparent)`,
  },
  selectedUp: {
    backgroundColor: color.success,
  },
  selectedDown: {
    backgroundColor: color.destructive,
  },
  baseline: {
    position: "absolute",
    insetInline: space._0,
    blockSize: "1px",
    backgroundColor: color.border,
  },
  at: (baseline: number) => ({
    insetBlockStart: `${(baseline * 100).toFixed(2)}%`,
  }),
  tick: {
    whiteSpace: "nowrap",
  },
  wideTick: {
    display: { default: "inline", [NARROW]: "none" },
  },
  narrowTick: {
    display: { default: "none", [NARROW]: "inline" },
  },
});
