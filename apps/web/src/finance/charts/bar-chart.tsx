"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  useId,
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { t } from "#src/i18n.ts";
import { buildBarGeometry, type BarLayout } from "./build-bar-geometry.ts";
import { ChartDataTable } from "./chart-data-table.tsx";
import { ChartLegend } from "./chart-legend.tsx";
import { chartMarks } from "./chart-marks.stylex.ts";
import { chooseBarTicks } from "./choose-bar-ticks.ts";
import { seriesFill, seriesKey } from "./series-marks.stylex.ts";
import type { SeriesTone } from "./series-tone-at.ts";
import { useChartScrub } from "./use-chart-scrub.ts";
import { useElementWidth } from "./use-element-width.ts";

export interface BarSeries {
  key: string;
  label: string;
  /** One value per period, in minor units. */
  values: ArrayLike<number>;
  tone: SeriesTone;
}

interface BarChartProps {
  /** Names what the bars show, such as "Spending by category"; the chart's title. */
  label: string;
  /** One sentence on what the chart shows, for assistive technology. */
  description: string;
  periodCount: number;
  /** A period in full, for the readout and the table, such as "Sep 2026". */
  periodLabel: (index: number) => string;
  /** A period in short, for the axis, such as "Sep". */
  periodTick: (index: number) => string;
  /**
   * Marks the periods an axis tick should land on when it can, such as each
   * January of a monthly chart (its tick then shows the year). Ticks then
   * step by 1, 2, 3, 4, 6 or a multiple of 12 periods.
   */
  periodMajor?: (index: number) => boolean;
  /** 1 for a period the range cuts short, such as this month so far: its bars draw lighter. */
  partialPeriods?: ArrayLike<number>;
  /** Pass a new array when the data changes: that also clears the picked period. */
  series: readonly BarSeries[];
  /** Stacked segments or bars side by side. One series draws plain bars either way. */
  layout?: BarLayout;
  formatValue: (minor: number) => string;
  formatTick: (minor: number, step: number) => string;
  /** What the readout row shows while no period is picked. */
  restReadout?: ReactNode;
  /** What the readout row shows for a picked period, before its label; the total by default. */
  readout?: (index: number) => ReactNode;
  /** The drawing's height in pixels, axis included. */
  height?: number;
  /** A level drawn across the plot, such as an average. */
  referenceLine?: { value: number; label: string };
  /** The series to bring forward; the others fade. */
  activeSeriesKey?: string | null;
  /** Called when a bar is tapped or picked with Enter, with the series under the pointer. */
  onActivate?: (periodIndex: number, seriesKey: string | null) => void;
  /** What tapping a bar does, for assistive technology, such as "Enter shows the transactions." */
  activateHint?: string;
}

const TOP = 14;
const AXIS_BAND = 22;
const BOTTOM_GAP = 8;
const GUTTER = 52;
const TABLE_ROWS = 100;

/**
 * Bars over periods, stacked or side by side, with hairline gridlines and
 * ticks in a right gutter. Point, tap or use the arrow keys to read a
 * period: the legend then shows each series' value. Tap a bar, or press
 * Enter, to act on it. A hidden table holds the values.
 */
export function BarChart({
  label,
  description,
  periodCount,
  periodLabel,
  periodTick,
  periodMajor,
  partialPeriods,
  series,
  layout = "stacked",
  formatValue,
  formatTick,
  restReadout,
  readout,
  height = 200,
  referenceLine,
  activeSeriesKey = null,
  onActivate,
  activateHint,
}: BarChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const readoutId = useId();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const stacked = layout === "stacked" && series.length > 1;

  const geometry = useMemo(() => {
    const plotRight = Math.max(width - GUTTER, 0);
    const plotBottom = height - AXIS_BAND - BOTTOM_GAP;
    const bars = buildBarGeometry({
      periodCount,
      series,
      layout,
      plotRight,
      top: TOP,
      bottom: plotBottom,
      tickCount: height < 180 ? 3 : 4,
      alsoShow: referenceLine ? [referenceLine.value] : undefined,
      partial: partialPeriods,
    });
    return { ...bars, plotRight, plotBottom };
  }, [
    periodCount,
    series,
    layout,
    width,
    height,
    referenceLine,
    partialPeriods,
  ]);

  const xTicks = chooseBarTicks({
    periodCount,
    band: geometry.band,
    tickOf: periodTick,
    isMajor: periodMajor,
  });

  const totals = useMemo(() => {
    const sums = new Float64Array(periodCount);
    for (const { values } of series) {
      for (let index = 0; index < periodCount; index++) {
        sums[index] += values[index];
      }
    }
    return sums;
  }, [periodCount, series]);

  const table = [];
  for (
    let index = Math.max(periodCount - TABLE_ROWS, 0);
    index < periodCount;
    index++
  ) {
    if (totals[index] === 0) continue;
    const cells = [
      periodLabel(index),
      ...series.map(({ values }) => formatValue(values[index])),
    ];
    if (stacked) cells.push(formatValue(totals[index]));
    table.push({ key: String(index), cells });
  }

  const totalLabel = t({ en: "Total", zh: "合计" });

  function seriesAt(index: number, x: number, y: number): string | null {
    for (let which = 0; which < geometry.spans.length; which++) {
      const span = geometry.spans[which];
      const left = span.x[index];
      if (Number.isNaN(left)) continue;
      const withinX =
        layout === "stacked" ||
        (x >= left - 1 && x <= left + geometry.barWidth + 1);
      const low = Math.min(span.yBase[index], span.yEnd[index]) - 2;
      const high = Math.max(span.yBase[index], span.yEnd[index]) + 2;
      if (withinX && y >= low && y <= high) return series[which].key;
    }
    return null;
  }

  function indexAt(x: number) {
    if (geometry.band <= 0) return -1;
    const index = Math.floor(x / geometry.band);
    return Math.min(Math.max(index, 0), periodCount - 1);
  }

  const scrub = useChartScrub({ data: series, count: periodCount, indexAt });
  const { active } = scrub;

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (!onActivate) return;
    const rect = scrub.measure(event);
    const index = indexAt(event.clientX - rect.left);
    if (index < 0) return;
    const key = seriesAt(
      index,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    if (key !== null || series.length === 1) {
      onActivate(index, key ?? series[0].key);
    } else if (totals[index] !== 0) {
      onActivate(index, null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && active !== null && onActivate) {
      event.preventDefault();
      onActivate(
        active,
        series.length === 1 ? series[0].key : (activeSeriesKey ?? null),
      );
    } else {
      scrub.onKeyDown(event);
    }
  }

  const hasBars = width > 0 && periodCount > 0;
  const { band, plotRight, plotBottom } = geometry;
  const legendItems = series.map((item) => ({
    label:
      active === null
        ? item.label
        : `${item.label} ${formatValue(item.values[active])}`,
    keyStyle: seriesKey[item.tone],
    shape: "square" as const,
  }));
  const sentenceEnd = t({ en: ". ", zh: "。" });
  const sentenceGap = sentenceEnd.endsWith(" ") ? " " : "";
  const keyboardHint = t({
    en: "Use the arrow keys to read each period.",
    zh: "用方向键逐段查看。",
  });

  return (
    <figure css={[stack.tight, styles.figure]}>
      <div
        id={readoutId}
        aria-live="polite"
        css={[row.item, typeRole.caption, styles.readout]}
      >
        {active === null ? (
          restReadout
        ) : (
          <>
            {readout ? (
              readout(active)
            ) : (
              <span css={[typeModifier.numeric, styles.readoutValue]}>
                {formatValue(totals[active])}
              </span>
            )}
            <span>{periodLabel(active)}</span>
          </>
        )}
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${label}${sentenceEnd}${keyboardHint}${
          activateHint ? `${sentenceGap}${activateHint}` : ""
        }`}
        aria-describedby={readoutId}
        css={[
          corner.radius_2,
          a11y.focusRing,
          styles.plot,
          onActivate && styles.actionable,
        ]}
        onPointerDown={scrub.onPointerDown}
        onPointerMove={scrub.onPointerMove}
        onPointerLeave={scrub.clear}
        onPointerCancel={scrub.clear}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onBlur={scrub.onBlur}
      >
        <svg
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          width={width}
          height={height}
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          css={styles.svg}
        >
          <title id={titleId}>{label}</title>
          <desc id={descriptionId}>{description}</desc>
          {hasBars ? (
            <>
              {active === null ? null : (
                <rect
                  x={active * band}
                  y={TOP - 6}
                  width={Math.max(band, 1)}
                  height={plotBottom - TOP + 12}
                  css={styles.activeBand}
                />
              )}
              {geometry.yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={0}
                    x2={plotRight}
                    y1={Math.round(tick.y) + 0.5}
                    y2={Math.round(tick.y) + 0.5}
                    css={
                      tick.value === 0
                        ? chartMarks.zeroLine
                        : chartMarks.gridline
                    }
                  />
                  <text
                    x={width}
                    y={tick.y}
                    dy="0.32em"
                    textAnchor="end"
                    css={[
                      typeRole.caption,
                      typeModifier.numeric,
                      chartMarks.axisLabel,
                    ]}
                  >
                    {formatTick(tick.value, geometry.tickStep)}
                  </text>
                </g>
              ))}
              {series.map((item, index) => (
                <g
                  key={item.key}
                  css={[
                    styles.bars,
                    activeSeriesKey !== null &&
                      activeSeriesKey !== item.key &&
                      styles.faded,
                  ]}
                >
                  <path d={geometry.paths[index]} css={seriesFill[item.tone]} />
                  {geometry.partialPaths[index] ? (
                    <path
                      d={geometry.partialPaths[index]}
                      css={[seriesFill[item.tone], styles.partial]}
                    />
                  ) : null}
                </g>
              ))}
              {referenceLine ? (
                <g>
                  <line
                    x1={0}
                    x2={plotRight}
                    y1={Math.round(geometry.y(referenceLine.value)) + 0.5}
                    y2={Math.round(geometry.y(referenceLine.value)) + 0.5}
                    css={styles.reference}
                  />
                </g>
              ) : null}
              {xTicks.map((tick) => (
                <text
                  key={tick.index}
                  x={tick.x}
                  y={height - 4}
                  textAnchor={tick.anchor}
                  css={[typeRole.caption, chartMarks.axisLabel]}
                >
                  {tick.label}
                </text>
              ))}
            </>
          ) : null}
        </svg>
      </div>
      {series.length > 1 ? <ChartLegend items={legendItems} /> : null}
      {referenceLine ? (
        <p css={[row.tight, typeRole.caption, styles.referenceNote]}>
          <span aria-hidden css={styles.referenceKey} />
          <span css={typeModifier.numeric}>{referenceLine.label}</span>
        </p>
      ) : null}
      <ChartDataTable
        caption={label}
        columns={[
          t({ en: "Period", zh: "时段" }),
          ...series.map((item) => item.label),
          ...(stacked ? [totalLabel] : []),
        ]}
        rows={table}
      />
    </figure>
  );
}

const styles = stylex.create({
  figure: {
    margin: 0,
    minInlineSize: 0,
  },
  readout: {
    minBlockSize: space._5,
    color: color.fgMuted,
    flexWrap: "wrap",
    columnGap: rhythm.item,
  },
  readoutValue: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
  plot: {
    position: "relative",
    touchAction: "pan-y",
    userSelect: "none",
  },
  actionable: {
    cursor: "pointer",
  },
  svg: {
    display: "block",
    overflow: "visible",
  },
  bars: {
    transitionProperty: "opacity",
    transitionDuration: "120ms",
  },
  faded: {
    opacity: 0.3,
  },
  partial: {
    fillOpacity: 0.4,
  },
  activeBand: {
    fill: color.bgNeutralSubtle,
  },
  reference: {
    stroke: color.fg,
    strokeWidth: 1,
    strokeDasharray: "4 3",
    shapeRendering: "crispEdges",
  },
  referenceNote: {
    margin: 0,
    color: color.fgMuted,
  },
  referenceKey: {
    display: "inline-block",
    inlineSize: space._3,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: "dashed",
    borderBlockStartColor: color.fg,
  },
});
