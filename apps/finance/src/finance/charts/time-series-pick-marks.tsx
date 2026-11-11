"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { useId, type Ref } from "react";
import { AreaGradient } from "./area-gradient.tsx";
import type { TimeSeriesGeometry } from "./build-time-series-geometry.ts";
import { chartMarks } from "./chart-marks.stylex.ts";
import { crisp } from "./crisp.ts";
import { placeLabel } from "./place-label.ts";
import { toneColor } from "./tone-color.stylex.ts";

const DOT_RADIUS = 5;
/** A dot's radius and the outer half of its ring. */
const DOT_REACH = DOT_RADIUS + 1;

interface TimeSeriesPickMarksProps {
  geometry: TimeSeriesGeometry;
  range: { start: number; end: number } | null;
  active: number | null;
  tone: keyof typeof toneColor;
  width: number;
  height: number;
  bleed: { left: number; right: number };
  textLeft: number;
  textRight: number;
  plotTop: number;
  plotBottom: number;
  formatValue: (minor: number) => string;
  maxRef: Ref<SVGTextElement>;
  minRef: Ref<SVGTextElement>;
}

export function TimeSeriesPickMarks({
  geometry,
  range,
  active,
  tone,
  width,
  height,
  bleed,
  textLeft,
  textRight,
  plotTop,
  plotBottom,
  formatValue,
  maxRef,
  minRef,
}: TimeSeriesPickMarksProps) {
  const rangeGradientId = useId();
  const rangeClipId = useId();
  const marked = range
    ? [range.start, range.end]
    : active !== null
      ? [active]
      : [];

  const { summary, xs, ys, trendYs, gradient } = geometry;
  // Where the plot reaches the screen edge, the marks of the first and last
  // day move in from the true x so that the screen does not cut the dots.
  const markLeft = Math.min(bleed.left, DOT_REACH);
  const markRight = width - Math.min(bleed.right, DOT_REACH);
  const markX = (index: number) =>
    Math.min(Math.max(xs[index], markLeft), markRight);
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
    <>
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
            ref={maxRef}
            x={maxLabel.x}
            y={ys[summary.maxIndex] - 8}
            textAnchor={maxLabel.anchor}
            css={[typeRole.caption, typeModifier.numeric, styles.extreme]}
          >
            {formatValue(summary.max)}
          </text>
          {summary.minIndex === summary.maxIndex ? null : (
            <text
              ref={minRef}
              x={minLabel.x}
              y={ys[summary.minIndex] + 8}
              dy="0.8em"
              textAnchor={minLabel.anchor}
              css={[typeRole.caption, typeModifier.numeric, styles.extreme]}
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
              y1={plotTop - 8}
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
  );
}

const styles = stylex.create({
  extreme: {
    fill: color.foreground,
  },
  trendDot: {
    fill: color.mutedForeground,
  },
});
