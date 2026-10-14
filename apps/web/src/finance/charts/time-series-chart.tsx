"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { bisectCenter } from "d3-array";
import { useId, useMemo, type ReactNode } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import type { ChartSeries } from "./build-chart-series.ts";
import {
  buildTimeSeriesGeometry,
  type TimeSeriesGeometry,
} from "./build-time-series-geometry.ts";
import { ChartDataTable } from "./chart-data-table.tsx";
import { ChartLegend } from "./chart-legend.tsx";
import { chartMarks } from "./chart-marks.stylex.ts";
import { crisp } from "./crisp.ts";
import { plotXFromPointer } from "./plot-x-from-pointer.ts";
import {
  useChartSelection,
  type ChartSelection,
} from "./use-chart-selection.ts";
import { useElementWidth } from "./use-element-width.ts";

interface TimeSeriesChartProps {
  series: ChartSeries;
  /** Names the plotted value, such as "Net worth"; the chart's title. */
  label: string;
  /** A trend line drawn under the line, one value per point of `series`. */
  trend?: { label: string; values: Float64Array };
  /** One sentence on what the chart shows, for assistive technology. */
  description: string;
  /** A value in full, for the readout and the extremes. */
  formatValue: (minor: number) => string;
  /** The values' currency, for the change between two picked days. */
  currency: string;
  /** What the readout row shows while nothing is picked, such as the range. */
  restReadout?: ReactNode;
  /** The drawing's height in pixels, axis included. */
  height?: number;
}

const TOP = 22;
const AXIS_BAND = 22;
const BOTTOM_GAP = 18;
const TABLE_ROWS = 24;
const TICK_SPACING = 76;
const AREA_DEPTH = 0.32;
const DOT_RADIUS = 5;
/** A dot's radius and the outer half of its ring. */
const DOT_REACH = DOT_RADIUS + 1;
const TICK_EDGE = 24;

/** Where a label at `x` sits: within `edge` of a side, it aligns to that side and stays inside it. */
function placeLabel(x: number, left: number, right: number, edge: number) {
  if (x < left + edge)
    return { x: Math.max(x, left), anchor: "start" as const };
  if (x > right - edge)
    return { x: Math.min(x, right), anchor: "end" as const };
  return { x, anchor: "middle" as const };
}

function changeTone(change: number) {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

function rangeOf(selection: ChartSelection | null) {
  if (selection?.kind !== "range") return null;
  return {
    start: Math.min(selection.anchor, selection.index),
    end: Math.max(selection.anchor, selection.index),
  };
}

/**
 * A smooth line over time with an area that fades to zero, gridlines, the
 * lowest and highest point labelled, and an optional trend line. Point, drag
 * with one finger or use the arrow keys to read any day; drag the mouse,
 * touch with two fingers or hold Shift with the arrow keys to read the change
 * between two days. A hidden table holds the values for assistive
 * technology. Everything is worked out from `series` once per range and
 * width, so a new range draws in one frame.
 */
export function TimeSeriesChart({
  series,
  label,
  trend,
  description,
  formatValue,
  currency,
  restReadout,
  height = 200,
}: TimeSeriesChartProps) {
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const readoutId = useId();
  const rangeGradientId = useId();
  const rangeClipId = useId();
  const { ref, width, bleed } = useElementWidth<HTMLDivElement>();
  const trendValues = trend?.values ?? null;
  const textLeft = bleed.left;
  const textRight = width - bleed.right;
  const plotBottom = height - AXIS_BAND - BOTTOM_GAP;

  const geometry = useMemo(
    () =>
      buildTimeSeriesGeometry({
        series,
        trend: trendValues,
        width,
        top: TOP,
        bottom: plotBottom,
        tickCount: height < 180 ? 3 : 4,
        dateSpacing: TICK_SPACING,
      }),
    [series, trendValues, width, plotBottom, height],
  );

  const table = useMemo(() => {
    const { days, values } = series;
    const step = Math.max(Math.ceil(days.length / TABLE_ROWS), 1);
    const rows = [];
    for (let index = days.length - 1; index >= 0; index -= step) {
      const cells = [
        displayDay(days[index], locale, "dayYear"),
        formatValue(values[index]),
      ];
      if (trendValues) cells.push(formatValue(Math.round(trendValues[index])));
      rows.push({ key: String(days[index]), cells });
    }
    return rows.reverse();
  }, [series, trendValues, locale, formatValue]);

  const pick = useChartSelection({
    data: series,
    count: series.days.length,
    indexAt: (x) =>
      geometry.xs.length > 0
        ? bisectCenter(geometry.xs, plotXFromPointer(x, width, bleed))
        : -1,
    plotRef: ref,
  });
  const { selection } = pick;
  const active = selection?.kind === "point" ? selection.index : null;
  const range = rangeOf(selection);
  const from = range ? series.values[range.start] : 0;
  const change = range ? series.values[range.end] - from : 0;
  const tone = changeTone(change);
  const day = (index: number) =>
    displayDay(series.days[index], locale, "dayYear");
  const rangeDays = range
    ? range.start === range.end
      ? day(range.start)
      : `${day(range.start)} – ${day(range.end)}`
    : null;
  const marked = range
    ? [range.start, range.end]
    : active !== null
      ? [active]
      : [];

  const { summary, xs, ys, trendYs, gradient } = geometry;
  const hasPoints = width > 0 && series.days.length > 0;
  // Where the plot reaches the screen edge, the marks of the first and last
  // day move in from the true x so that the screen does not cut the dots.
  const markLeft = Math.min(bleed.left, DOT_REACH);
  const markRight = width - Math.min(bleed.right, DOT_REACH);
  const markX = (index: number) =>
    Math.min(Math.max(xs[index], markLeft), markRight);
  const activeTrend =
    active !== null && trendValues ? trendValues[active] : null;
  const extremeEdge = (textRight - textLeft) * 0.25;
  const maxLabel = placeLabel(
    xs[summary.maxIndex],
    textLeft,
    textRight,
    extremeEdge,
  );
  const minLabel = placeLabel(
    xs[summary.minIndex],
    textLeft,
    textRight,
    extremeEdge,
  );

  return (
    <figure css={[stack.tight, styles.figure]}>
      <div
        id={readoutId}
        aria-live="polite"
        css={[row.item, typeRole.caption, styles.readout]}
      >
        {range ? (
          <>
            <span>
              <span css={a11y.srOnly}>
                {t({ en: "Change: ", zh: "变化：" })}
              </span>
              <MoneyChange
                changeMinor={change}
                fromMinor={from}
                currency={currency}
                tone
              />
            </span>
            <span>{rangeDays}</span>
          </>
        ) : active === null ? (
          restReadout
        ) : (
          <>
            <span css={[typeModifier.numeric, styles.readoutValue]}>
              {formatValue(series.values[active])}
            </span>
            {activeTrend === null || trend === undefined ? null : (
              <span css={[row.inline, typeModifier.numeric]}>
                <span
                  aria-hidden
                  css={[styles.readoutKey, chartMarks.trendKey]}
                />
                <span css={a11y.srOnly}>
                  {`${trend.label}${t({ en: ": ", zh: "：" })}`}
                </span>
                {formatValue(Math.round(activeTrend))}
              </span>
            )}
            <span>{day(active)}</span>
          </>
        )}
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${label}${t({ en: ". ", zh: "。" })}${t({
          en: "Use the arrow keys to read each day, and hold Shift with them to compare two days.",
          zh: "用方向键逐日查看，按住 Shift 键再用方向键可比较两天。",
        })}`}
        aria-describedby={readoutId}
        css={[corner.radius_2, a11y.focusRing, styles.plot]}
        onPointerDown={pick.onPointerDown}
        onPointerEnter={pick.measure}
        onPointerMove={pick.onPointerMove}
        onPointerLeave={pick.onPointerLeave}
        onPointerUp={pick.onPointerUp}
        onPointerCancel={pick.onPointerCancel}
        onKeyDown={pick.onKeyDown}
        onBlur={pick.onBlur}
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
              <StaticPlot
                geometry={geometry}
                width={width}
                textLeft={textLeft}
                textRight={textRight}
                height={height}
                dimmed={range !== null}
              />
              {range ? (
                <>
                  <defs>
                    <AreaGradient
                      id={rangeGradientId}
                      gradient={gradient}
                      tone={tone}
                    />
                    <clipPath id={rangeClipId}>
                      <rect
                        x={xs[range.start]}
                        y={0}
                        width={xs[range.end] - xs[range.start]}
                        height={height}
                      />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${rangeClipId})`} css={toneColor[tone]}>
                    <path d={geometry.area} fill={`url(#${rangeGradientId})`} />
                    <path d={geometry.line} css={chartMarks.line} />
                  </g>
                </>
              ) : null}
              {marked.length === 0 ? (
                <>
                  <text
                    x={maxLabel.x}
                    y={ys[summary.maxIndex] - 8}
                    textAnchor={maxLabel.anchor}
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
                      x={minLabel.x}
                      y={ys[summary.minIndex] + 8}
                      dy="0.8em"
                      textAnchor={minLabel.anchor}
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
                <g css={toneColor[tone]}>
                  {marked.map((index, order) => (
                    <line
                      key={order}
                      x1={crisp(markX(index))}
                      x2={crisp(markX(index))}
                      y1={TOP - 8}
                      y2={plotBottom + 8}
                      css={chartMarks.crosshair}
                    />
                  ))}
                  {active !== null && trendYs ? (
                    <circle
                      cx={markX(active)}
                      cy={trendYs[active]}
                      r={4}
                      css={[styles.trendDot, chartMarks.dotRing]}
                    />
                  ) : null}
                  {marked.map((index, order) => (
                    <circle
                      key={order}
                      cx={markX(index)}
                      cy={ys[index]}
                      r={DOT_RADIUS}
                      css={[chartMarks.dotFill, chartMarks.dotRing]}
                    />
                  ))}
                </g>
              )}
            </>
          ) : null}
        </svg>
      </div>
      {trend ? (
        <ChartLegend
          items={[
            { label, keyStyle: chartMarks.primaryKey, shape: "line" },
            {
              label: trend.label,
              keyStyle: chartMarks.trendKey,
              shape: "line",
            },
          ]}
        />
      ) : null}
      <ChartDataTable
        caption={label}
        columns={[
          t({ en: "Date", zh: "日期" }),
          label,
          ...(trend ? [trend.label] : []),
        ]}
        rows={table}
      />
    </figure>
  );
}

function AreaGradient({
  id,
  gradient,
  tone,
}: {
  id: string;
  gradient: TimeSeriesGeometry["gradient"];
  tone: keyof typeof toneColor;
}) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={0}
      x2={0}
      y1={gradient.y1}
      y2={gradient.y2}
      css={toneColor[tone]}
    >
      {gradient.stops.map((stop, index) => (
        <stop
          key={index}
          offset={stop.offset}
          stopOpacity={stop.strength * AREA_DEPTH}
          css={chartMarks.areaStop}
        />
      ))}
    </linearGradient>
  );
}

/** The gridlines, the date labels and the line: the parts a pick leaves as they are. */
function StaticPlot({
  geometry,
  width,
  textLeft,
  textRight,
  height,
  dimmed,
}: {
  geometry: TimeSeriesGeometry;
  width: number;
  /** The span the date labels stay inside. */
  textLeft: number;
  textRight: number;
  height: number;
  dimmed: boolean;
}) {
  const locale = useLocale();
  const gradientId = useId();
  return (
    <>
      <defs>
        <AreaGradient
          id={gradientId}
          gradient={geometry.gradient}
          tone="flat"
        />
      </defs>
      {geometry.yTicks.map((tick) => (
        <line
          key={tick.value}
          x1={0}
          x2={width}
          y1={crisp(tick.y)}
          y2={crisp(tick.y)}
          css={chartMarks.gridline}
        />
      ))}
      {geometry.zeroY === null ? null : (
        <line
          x1={0}
          x2={width}
          y1={crisp(geometry.zeroY)}
          y2={crisp(geometry.zeroY)}
          css={chartMarks.zeroLine}
        />
      )}
      <g css={[toneColor.flat, dimmed && styles.dimmed]}>
        <path d={geometry.area} fill={`url(#${gradientId})`} />
        {geometry.trendLine ? (
          <path d={geometry.trendLine} css={chartMarks.trendLine} />
        ) : null}
        <path d={geometry.line} css={chartMarks.line} />
      </g>
      {geometry.xTicks.map((tick) => {
        const label = placeLabel(tick.x, textLeft, textRight, TICK_EDGE);
        return (
          <text
            key={tick.epochDay}
            x={label.x}
            y={height - 4}
            textAnchor={label.anchor}
            css={[typeRole.caption, chartMarks.axisLabel]}
          >
            {displayDay(tick.epochDay, locale, tick.unit)}
          </text>
        );
      })}
    </>
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
  // Below `md`, the plot goes through the page gutter to the edges of the
  // screen. The text in the plot stays out of the gutter.
  plot: {
    position: "relative",
    marginInlineStart: {
      default: `calc(-1 * ${pageGutter.inlineStart})`,
      [breakpoints.md]: 0,
    },
    marginInlineEnd: {
      default: `calc(-1 * ${pageGutter.inlineEnd})`,
      [breakpoints.md]: 0,
    },
    touchAction: "pan-y",
    userSelect: "none",
    cursor: "crosshair",
  },
  svg: {
    display: "block",
    overflow: "visible",
  },
  dimmed: {
    opacity: 0.4,
  },
  extreme: {
    fill: color.fg,
  },
  trendDot: {
    fill: color.fgMuted,
  },
});

const toneColor = stylex.create({
  up: { color: color.bgSuccess },
  down: { color: color.bgDanger },
  flat: { color: color.bgAccent },
});
