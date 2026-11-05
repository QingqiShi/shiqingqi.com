"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { displayDay, displayDayRange } from "../domain/dates/display-day.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import type { ChartSeries } from "./build-chart-series.ts";
import { chartMarks } from "./chart-marks.stylex.ts";
import type { ChartSelection } from "./use-chart-selection.ts";

interface TimeSeriesReadoutProps {
  id: string;
  series: ChartSeries;
  trend: { label: string; values: Float64Array } | undefined;
  selection: ChartSelection | null;
  range: { start: number; end: number } | null;
  active: number | null;
  from: number;
  change: number;
  formatValue: (minor: number) => string;
  currency: string;
  restReadout: ReactNode;
  besideAccessory: boolean;
  assistiveOnly: boolean;
}

export function TimeSeriesReadout({
  id,
  series,
  trend,
  selection,
  range,
  active,
  from,
  change,
  formatValue,
  currency,
  restReadout,
  besideAccessory,
  assistiveOnly,
}: TimeSeriesReadoutProps) {
  const locale = useLocale();
  const trendValues = trend?.values ?? null;
  const day = (index: number) =>
    displayDay(series.days[index], locale, "dayYear");
  const rangeDays = range
    ? displayDayRange(series.days[range.start], series.days[range.end], locale)
    : null;
  const activeTrend =
    active !== null && trendValues ? trendValues[active] : null;

  return (
    <div
      id={id}
      aria-live="polite"
      css={[
        typeRole.caption,
        styles.readout,
        besideAccessory && styles.readoutBesideAccessory,
        assistiveOnly && a11y.srOnly,
      ]}
    >
      <div
        css={[
          row.item,
          styles.readoutLayer,
          selection !== null && styles.readoutHidden,
        ]}
      >
        {restReadout}
      </div>
      {selection === null ? null : (
        <div css={[row.item, styles.readoutLayer]}>
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
          ) : active === null ? null : (
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
      )}
    </div>
  );
}

const styles = stylex.create({
  // The readout at rest and the readout of a pick share one cell, so that
  // the row keeps the height of the taller one and a pick moves nothing.
  readout: {
    display: "grid",
    minBlockSize: space._5,
    color: color.fgMuted,
  },
  readoutBesideAccessory: {
    flexGrow: 1,
  },
  readoutLayer: {
    gridArea: "1 / 1",
    flexWrap: "wrap",
    columnGap: rhythm.item,
  },
  readoutHidden: {
    visibility: "hidden",
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
});
