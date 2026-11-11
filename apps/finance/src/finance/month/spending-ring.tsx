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
import { plainList, truncate } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useId, useRef } from "react";
import { useAnalyticsNames } from "../analytics/use-analytics-names.ts";
import { seriesKey, seriesStroke } from "../charts/series-marks.stylex.ts";
import { formatPercent } from "../domain/money/format-percent.ts";
import type { MonthCategory, MonthView } from "./build-month-view.ts";
import { RollingFigure } from "./rolling-figure.tsx";
import { sweepsOf } from "./sweeps-of.ts";
import { monthSpring, useMonthSlide } from "./use-month-slide.ts";
import { wholeMoney } from "./whole-money.ts";

const SIZE = 200;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
/** The ring's length in the units of `pathLength`. */
const TURN = 100;
const CAP = (STROKE / 2 / (2 * Math.PI * RADIUS)) * TURN;
const GAP = 1.4;
/** The shortest dash of a slice, so that each slice reads as an arc and not as a dot. */
const MIN_DASH = 3;
/** The least share of the ring that a slice with any spending takes. */
const MIN_SWEEP = (2 * CAP + GAP + MIN_DASH) / TURN;

/**
 * The dash of a slice from `start` for `length`, both shares of the ring,
 * with round caps and a gap either side. A slice too short for its caps,
 * as it springs from nothing or to nothing, shows as a dot in its middle.
 */
function arcPose(start: number, length: number) {
  const span = length * TURN;
  const dash = Math.max(span - 2 * CAP - GAP, 0);
  const middle = start * TURN + span / 2;
  return {
    "stroke-dasharray": `${dash.toFixed(3)} ${String(TURN)}`,
    "stroke-dashoffset": (-(middle - dash / 2)).toFixed(3),
    opacity: Math.min(Math.max(span / 0.3, 0), 1).toFixed(3),
  };
}

function Arc({
  engine,
  slice,
  start,
  length,
}: {
  engine: MotionEngine;
  slice: MonthCategory;
  start: number;
  length: number;
}) {
  const from = useMotionValue(engine, 0, { precision: 0.0005 });
  const size = useMotionValue(engine, 0, { precision: 0.0005 });
  const ref = useRef<SVGCircleElement>(null);
  useBinding(ref, [from, size], { pose: arcPose, renderer: "frame" });
  useEffect(() => {
    from.to(start, { spring: monthSpring });
    size.to(length, { spring: monthSpring });
  }, [from, size, start, length]);
  return (
    <circle
      ref={ref}
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      pathLength={TURN}
      css={[styles.arc, seriesStroke[slice.tone]]}
    />
  );
}

/**
 * The month's spending as a ring of slices in the colours of Analytics,
 * with the total inside and a list of each Category's share. The slices
 * keep their order between months, so a new month springs each one from
 * its old share to its new one, and the ring sweeps in when it first shows.
 */
export function SpendingRing({
  view,
  currency,
}: {
  view: MonthView;
  currency: string;
}) {
  const locale = useLocale();
  const names = useAnalyticsNames();
  const headingId = useId();
  const engine = useMotionEngine();
  const listRef = useRef<HTMLUListElement>(null);
  useMonthSlide(listRef, view.month, 24);
  const otherLabel = t({ en: "Other", zh: "其他" });
  const noCategory = t({ en: "No category", zh: "无分类" });
  const slices = view.categories;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const money = (minor: number) => wholeMoney(minor, currency, locale, "auto");
  const labelOf = (slice: MonthCategory) => {
    if (slice.tone === "other") return otherLabel;
    if (slice.categoryId === null) return noCategory;
    return names.categoryLabel(slice.categoryId);
  };

  const sweeps = sweepsOf(
    slices.map((slice) => slice.value),
    MIN_SWEEP,
  );
  const arcs: { slice: MonthCategory; start: number; length: number }[] = [];
  for (const [at, slice] of slices.entries()) {
    const previous = arcs.at(-1);
    arcs.push({
      slice,
      start: previous ? previous.start + previous.length : 0,
      length: sweeps[at],
    });
  }
  const legend = slices
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <Heading level={2} look="h4" id={headingId}>
        {t({ en: "Spending by category", zh: "按分类支出" })}
      </Heading>
      <div css={[corner.radius_2, styles.panel]}>
        <div css={styles.ring}>
          <svg
            viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
            css={styles.svg}
            aria-hidden
          >
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} css={styles.track} />
            <g
              transform={`rotate(-90 ${String(SIZE / 2)} ${String(SIZE / 2)})`}
            >
              {arcs.map(({ slice, start: at, length }) => (
                <Arc
                  key={slice.tone}
                  engine={engine}
                  slice={slice}
                  start={at}
                  length={length}
                />
              ))}
            </g>
          </svg>
          <div css={styles.center}>
            <RollingFigure
              value={total}
              format={money}
              css={[typeRole.h2, typeModifier.numeric, styles.total]}
            />
            <Text as="span" look="caption" tone="muted">
              {t({ en: "Spent", zh: "总支出" })}
            </Text>
          </div>
        </div>
      </div>
      {legend.length === 0 ? (
        <Text look="bodySmall" tone="muted" measure="none">
          {t({ en: "No spending this month.", zh: "本月没有支出。" })}
        </Text>
      ) : (
        <ul ref={listRef} css={[plainList.list, stack.text]}>
          {legend.map((slice) => (
            <li key={slice.tone} css={[plainList.row, styles.row]}>
              <span
                aria-hidden
                css={[
                  corner.radius_round,
                  styles.swatch,
                  seriesKey[slice.tone],
                ]}
              />
              <span css={[typeRole.bodySmall, truncate.base, styles.name]}>
                {labelOf(slice)}
              </span>
              <Text as="span" look="caption" tone="muted" numeric>
                {formatPercent(slice.value / total, locale)}
              </Text>
              <span
                css={[typeRole.bodySmall, typeModifier.numeric, styles.amount]}
              >
                {money(slice.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const styles = stylex.create({
  panel: {
    display: "flex",
    justifyContent: "center",
    paddingBlock: space._5,
    backgroundColor: color.muted,
  },
  ring: {
    position: "relative",
    inlineSize: "min(14rem, 100%)",
    aspectRatio: "1",
  },
  svg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
    overflow: "visible",
  },
  track: {
    fill: "none",
    stroke: color.secondary,
    strokeWidth: STROKE,
    opacity: 0.5,
  },
  arc: {
    fill: "none",
    strokeWidth: STROKE,
    strokeLinecap: "round",
    opacity: 0,
  },
  center: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  total: {
    fontWeight: font.weight_7,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    alignItems: "center",
    columnGap: rhythm.tight,
    paddingBlock: space._1,
  },
  swatch: {
    inlineSize: space._2,
    blockSize: space._2,
  },
  name: {
    minInlineSize: 0,
  },
  amount: {
    minInlineSize: "5rem",
    textAlign: "end",
    fontWeight: font.weight_5,
  },
});
