"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "@tuja/i18n/use-locale";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { useId, type Ref } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import { AreaGradient } from "./area-gradient.tsx";
import type { TimeSeriesGeometry } from "./build-time-series-geometry.ts";
import { chartMarks } from "./chart-marks.stylex.ts";
import { crisp } from "./crisp.ts";
import { placeLabel } from "./place-label.ts";
import { toneColor } from "./tone-color.stylex.ts";

const TICK_EDGE = 24;

/** The gridlines, the date labels and the line: the parts a pick leaves as they are. */
export function StaticPlot({
  geometry,
  width,
  textLeft,
  textRight,
  height,
  dimmed,
  lineRef,
}: {
  geometry: TimeSeriesGeometry;
  width: number;
  /** The span the date labels stay inside. */
  textLeft: number;
  textRight: number;
  height: number;
  dimmed: boolean;
  /** Marks the line and its area as a form of a Shared element. */
  lineRef: Ref<SVGGElement>;
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
      <g ref={lineRef} css={[toneColor.flat, dimmed && styles.dimmed]}>
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
  dimmed: {
    opacity: 0.4,
  },
});
