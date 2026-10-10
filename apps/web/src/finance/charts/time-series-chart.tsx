"use client";

import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId, useMemo, type PointerEvent, type ReactNode } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import type { ChartSeries } from "./build-chart-series.ts";
import { ChartDataTable } from "./chart-data-table.tsx";
import { chartDomain } from "./chart-domain.ts";
import { ChartLegend } from "./chart-legend.tsx";
import { chartMarks } from "./chart-marks.stylex.ts";
import { dateTicks, type DateTick } from "./date-ticks.ts";
import { areaPath, linePath } from "./line-path.ts";
import { linearScale } from "./linear-scale.ts";
import { nearestIndex } from "./nearest-index.ts";
import { niceTicks } from "./nice-ticks.ts";
import { summariseSeries } from "./summarise-series.ts";
import { useChartScrub } from "./use-chart-scrub.ts";
import { useElementWidth } from "./use-element-width.ts";

interface TimeSeriesChartProps {
  series: ChartSeries;
  /** Names the plotted value, such as "Net worth"; the chart's title. */
  label: string;
  /** Names the trend line, when the series has one. */
  trendLabel?: string;
  /** One sentence on what the chart shows, for assistive technology. */
  description: string;
  /** A value in full, for the readout and the extremes. */
  formatValue: (minor: number) => string;
  /** A value in short, for the axis; `step` is the distance between ticks. */
  formatTick: (minor: number, step: number) => string;
  /** What the readout row shows while nothing is picked, such as the range. */
  restReadout?: ReactNode;
  /** The drawing's height in pixels, axis included. */
  height?: number;
}

const TOP = 22;
const AXIS_BAND = 22;
const BOTTOM_GAP = 18;
const GUTTER = 52;
const TABLE_ROWS = 24;
const TICK_SPACING = 76;

function tickStyle(tick: DateTick) {
  return tick.unit === "day" ? "day" : tick.unit === "month" ? "month" : "year";
}

function extremeAnchor(x: number, plotRight: number) {
  if (x < plotRight * 0.25) return "start";
  if (x > plotRight * 0.75) return "end";
  return "middle";
}

/**
 * A line over time with an area wash, gridlines, the lowest and highest
 * point labelled, and an optional trend line. Point, drag or use the arrow
 * keys to read any day; a hidden table holds the values for assistive
 * technology. Everything is worked out from `series` once per range and
 * width, so a new range draws in one frame.
 */
export function TimeSeriesChart({
  series,
  label,
  trendLabel,
  description,
  formatValue,
  formatTick,
  restReadout,
  height = 200,
}: TimeSeriesChartProps) {
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const readoutId = useId();
  const { ref, width } = useElementWidth<HTMLDivElement>();

  const geometry = useMemo(() => {
    const { days, values, trend } = series;
    const plotRight = Math.max(width - GUTTER, 0);
    const plotBottom = height - AXIS_BAND - BOTTOM_GAP;
    const [low, high] = chartDomain(values, trend);
    const first = days.length > 0 ? days[0] : 0;
    const last = days.length > 0 ? days[days.length - 1] : 0;
    const x = linearScale(first, last, 0, plotRight);
    const y = linearScale(low, high, plotBottom, TOP);
    const xs = Float64Array.from(days, x);
    const ys = Float64Array.from(values, y);
    const baseline = low <= 0 && high >= 0 ? y(0) : high < 0 ? TOP : plotBottom;
    const ticks = niceTicks(low, high, height < 180 ? 3 : 4);
    return {
      plotRight,
      plotBottom,
      xs,
      ys,
      trendYs: trend ? Float64Array.from(trend, y) : null,
      line: linePath(xs, ys),
      area: areaPath(xs, ys, baseline),
      trendLine: trend ? linePath(xs, Float64Array.from(trend, y)) : "",
      yTicks: ticks.map((value) => ({ value, y: y(value) })),
      tickStep: ticks.length > 1 ? ticks[1] - ticks[0] : Math.abs(high - low),
      zeroY: low < 0 && high > 0 ? y(0) : null,
      xTicks: dateTicks(first, last, Math.floor(plotRight / TICK_SPACING)).map(
        (tick) => ({ ...tick, x: x(tick.epochDay) }),
      ),
      summary: summariseSeries(values),
    };
  }, [series, width, height]);

  const table = useMemo(() => {
    const { days, values, trend } = series;
    const step = Math.max(Math.ceil(days.length / TABLE_ROWS), 1);
    const rows = [];
    for (let index = days.length - 1; index >= 0; index -= step) {
      const cells = [
        displayDay(days[index], locale, "dayYear"),
        formatValue(values[index]),
      ];
      if (trend) cells.push(formatValue(Math.round(trend[index])));
      rows.push({ key: String(days[index]), cells });
    }
    return rows.reverse();
  }, [series, locale, formatValue]);

  const scrub = useChartScrub({
    data: series,
    count: series.days.length,
    indexAt: (x) => nearestIndex(geometry.xs, x),
  });
  const { active } = scrub;

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") scrub.clear();
  }

  const { summary, xs, ys, trendYs, plotRight } = geometry;
  const hasPoints = width > 0 && series.days.length > 0;
  const activeTrend =
    active !== null && series.trend ? series.trend[active] : null;

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
            <span css={[typeModifier.numeric, styles.readoutValue]}>
              {formatValue(series.values[active])}
            </span>
            {activeTrend === null || trendLabel === undefined ? null : (
              <span css={[row.inline, typeModifier.numeric]}>
                <span
                  aria-hidden
                  css={[styles.readoutKey, chartMarks.trendKey]}
                />
                <span css={a11y.srOnly}>
                  {`${trendLabel}${t({ en: ": ", zh: "：" })}`}
                </span>
                {formatValue(Math.round(activeTrend))}
              </span>
            )}
            <span>{displayDay(series.days[active], locale, "dayYear")}</span>
          </>
        )}
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${label}${t({ en: ". ", zh: "。" })}${t({
          en: "Use the arrow keys to read each day.",
          zh: "用方向键逐日查看。",
        })}`}
        aria-describedby={readoutId}
        css={[corner.radius_2, a11y.focusRing, styles.plot]}
        onPointerDown={scrub.onPointerDown}
        onPointerEnter={scrub.measure}
        onPointerMove={scrub.onPointerMove}
        onPointerLeave={scrub.clear}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={scrub.onKeyDown}
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
          {hasPoints ? (
            <>
              {geometry.yTicks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={0}
                    x2={plotRight}
                    y1={Math.round(tick.y) + 0.5}
                    y2={Math.round(tick.y) + 0.5}
                    css={chartMarks.gridline}
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
              {geometry.zeroY === null ? null : (
                <line
                  x1={0}
                  x2={plotRight}
                  y1={Math.round(geometry.zeroY) + 0.5}
                  y2={Math.round(geometry.zeroY) + 0.5}
                  css={chartMarks.zeroLine}
                />
              )}
              <path d={geometry.area} css={chartMarks.primaryArea} />
              {geometry.trendLine ? (
                <path d={geometry.trendLine} css={chartMarks.trendLine} />
              ) : null}
              <path d={geometry.line} css={chartMarks.primaryLine} />
              {geometry.xTicks.map((tick) => (
                <text
                  key={tick.epochDay}
                  x={tick.x}
                  y={height - 4}
                  textAnchor={
                    tick.x < 24
                      ? "start"
                      : tick.x > plotRight - 24
                        ? "end"
                        : "middle"
                  }
                  css={[typeRole.caption, chartMarks.axisLabel]}
                >
                  {displayDay(tick.epochDay, locale, tickStyle(tick))}
                </text>
              ))}
              {active === null ? (
                <>
                  <text
                    x={xs[summary.maxIndex]}
                    y={ys[summary.maxIndex] - 8}
                    textAnchor={extremeAnchor(xs[summary.maxIndex], plotRight)}
                    css={[
                      typeRole.caption,
                      typeModifier.numeric,
                      styles.extreme,
                    ]}
                  >
                    {formatValue(summary.max)}
                  </text>
                  {summary.minIndex === summary.maxIndex ? null : (
                    <text
                      x={xs[summary.minIndex]}
                      y={ys[summary.minIndex] + 8}
                      dy="0.8em"
                      textAnchor={extremeAnchor(
                        xs[summary.minIndex],
                        plotRight,
                      )}
                      css={[
                        typeRole.caption,
                        typeModifier.numeric,
                        styles.extreme,
                      ]}
                    >
                      {formatValue(summary.min)}
                    </text>
                  )}
                </>
              ) : (
                <>
                  <line
                    x1={Math.round(xs[active]) + 0.5}
                    x2={Math.round(xs[active]) + 0.5}
                    y1={TOP - 8}
                    y2={geometry.plotBottom + 8}
                    css={chartMarks.crosshair}
                  />
                  {trendYs ? (
                    <circle
                      cx={xs[active]}
                      cy={trendYs[active]}
                      r={4}
                      css={[styles.trendDot, chartMarks.dotRing]}
                    />
                  ) : null}
                  <circle
                    cx={xs[active]}
                    cy={ys[active]}
                    r={5}
                    css={[chartMarks.primaryFill, chartMarks.dotRing]}
                  />
                </>
              )}
            </>
          ) : null}
        </svg>
      </div>
      {trendLabel !== undefined && series.trend ? (
        <ChartLegend
          items={[
            { label, keyStyle: chartMarks.primaryKey, shape: "line" },
            { label: trendLabel, keyStyle: chartMarks.trendKey, shape: "line" },
          ]}
        />
      ) : null}
      <ChartDataTable
        caption={label}
        columns={[
          t({ en: "Date", zh: "日期" }),
          label,
          ...(series.trend && trendLabel !== undefined ? [trendLabel] : []),
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
  readoutKey: {
    display: "inline-block",
    inlineSize: space._2,
    blockSize: "2px",
  },
  plot: {
    position: "relative",
    touchAction: "pan-y",
    userSelect: "none",
    cursor: "crosshair",
  },
  svg: {
    display: "block",
    overflow: "visible",
  },
  extreme: {
    fill: color.fg,
  },
  trendDot: {
    fill: color.fgMuted,
  },
});
