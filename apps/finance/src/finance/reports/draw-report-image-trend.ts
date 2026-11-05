import type { SupportedLocale } from "@tuja/i18n/types";
import { range, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { dateTicks } from "../charts/date-ticks.ts";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import {
  circlePath,
  colors,
  fonts,
  lineAndArea,
  linePath,
  withOpacity,
  type ReportImageCanvas,
} from "./report-image-canvas.ts";
import {
  IMAGE_CONTENT_WIDTH,
  IMAGE_TREND_HEIGHT,
} from "./report-image-layout.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

const TREND_LINE_WIDTH = 4;
const TREND_DOT_RADIUS = 8;
/** Room on the right of the trend for its amounts. */
const TREND_AXIS_WIDTH = 96;
/** The date labels under the trend. */
const TREND_AXIS_HEIGHT = 40;
/** A trend whose lowest point is above this share of its highest starts its axis near the lowest point, not at zero. */
const TREND_ZOOM_FLOOR = 0.4;

export function drawReportImageTrend(
  { left, contentRight, path, text }: ReportImageCanvas,
  data: WeeklyReportData,
  { top, locale }: { top: number; locale: SupportedLocale },
) {
  const currency = data.baseCurrency;
  const plotRight = IMAGE_CONTENT_WIDTH - TREND_AXIS_WIDTH;
  const plotTop = 14;
  const plotBottom = IMAGE_TREND_HEIGHT - TREND_AXIS_HEIGHT;
  const days = data.trend.map((point) => toEpochDay(point.day));
  const values = data.trend.map((point) => point.netWorthMinor);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const zoom = low > high * TREND_ZOOM_FLOOR;
  const floor = zoom ? low : Math.min(low, 0);
  const roundStep = tickStep(floor, high, zoom ? 4 : 5);
  const step =
    Number.isFinite(roundStep) && roundStep > 0
      ? roundStep
      : Math.max(Math.abs(high), 100);
  // A small dip below zero sets the bottom edge. Do not round it down to a full step, because that adds an empty band.
  const bottom = zoom ? Math.floor(low / step) * step : floor;
  const ceiling = Math.max(Math.ceil(high / step) * step, bottom + step);
  const y = scaleLinear()
    .domain([bottom, ceiling])
    .range([plotBottom, plotTop]);
  const x = scaleLinear()
    .domain([days[0], days[days.length - 1]])
    .range([0, plotRight]);
  const ticks = range(
    Math.ceil(bottom / step) * step,
    ceiling + step / 2,
    step,
  );
  for (const tick of ticks) {
    const tickY = y(tick);
    if (tickY < plotBottom - 1) {
      path(linePath(0, tickY, plotRight, tickY), left, top, {
        stroke: { color: colors.hairline, width: 1.5 },
      });
    }
    text(
      formatAxisMoney(tick, step, currency, locale),
      contentRight,
      top + tickY,
      fonts.caption,
      colors.muted,
      { align: "right" },
    );
  }
  const trend = lineAndArea(
    days.map((day) => x(day)),
    values.map((value) => y(value)),
    plotBottom,
  );
  path(trend.area, left, top, {
    fill: {
      y0: plotTop,
      y1: plotBottom,
      stops: [
        { offset: 0, color: withOpacity(colors.accent, 0.16) },
        { offset: 1, color: withOpacity(colors.accent, 0.01) },
      ],
    },
  });
  path(linePath(0, plotBottom, plotRight, plotBottom), left, top, {
    stroke: { color: colors.axis, width: 1.5 },
  });
  for (const tick of dateTicks(
    days[0],
    days[days.length - 1],
    Math.floor(plotRight / 150),
  )) {
    const tickX = x(tick.epochDay);
    path(linePath(tickX, plotBottom, tickX, plotBottom + 8), left, top, {
      stroke: { color: colors.axis, width: 1.5 },
    });
    text(
      displayDay(tick.epochDay, locale, tick.unit),
      left + tickX,
      top + plotBottom + 28,
      fonts.caption,
      colors.muted,
      { align: "center" },
    );
  }
  path(trend.line, left, top, {
    stroke: { color: colors.accent, width: TREND_LINE_WIDTH, round: true },
  });
  path(
    circlePath(plotRight, y(values[values.length - 1]), TREND_DOT_RADIUS),
    left,
    top,
    { fill: colors.accent, stroke: { color: colors.background, width: 3 } },
  );
}
