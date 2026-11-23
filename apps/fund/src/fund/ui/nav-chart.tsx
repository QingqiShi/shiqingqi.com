"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { displayDate } from "./display-date.ts";
import { formatMoney } from "./format-money.ts";
import { niceTicks } from "./nice-ticks.ts";
import { useElementWidth } from "./use-element-width.ts";

export interface NavChartPoint {
  date: string;
  navGbp: number;
  benchmarkGbp: number;
}

const HEIGHT = 200;
const TOP = 16;
const AXIS = 22;
const TABLE_ROWS = 24;

const styles = stylex.create({
  figure: {
    margin: 0,
    minInlineSize: 0,
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
  gridline: {
    stroke: color.border,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  axisLabel: {
    fill: color.mutedForeground,
  },
  // A halo in the card colour keeps a tick label legible where a line crosses it.
  tickLabel: {
    stroke: color.card,
    strokeWidth: 4,
    strokeLinejoin: "round",
    paintOrder: "stroke",
  },
  line: {
    fill: "none",
    strokeWidth: 2,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  },
  fund: {
    stroke: color.primary,
  },
  benchmark: {
    stroke: color.mutedForeground,
    strokeDasharray: "4 4",
  },
  crosshair: {
    stroke: color.mutedForeground,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  dot: {
    stroke: color.card,
    strokeWidth: 2,
  },
  fundDot: {
    fill: color.primary,
  },
  benchmarkDot: {
    fill: color.mutedForeground,
  },
  key: {
    display: "inline-block",
    inlineSize: space._3,
    blockSize: "2px",
    flexShrink: 0,
  },
  fundKey: {
    backgroundColor: color.primary,
  },
  benchmarkKey: {
    backgroundImage: `linear-gradient(to right, ${color.mutedForeground} 50%, transparent 50%)`,
    backgroundSize: "8px 2px",
  },
  readout: {
    minBlockSize: "2.75rem",
  },
});

function pathOf(xs: readonly number[], ys: readonly number[]): string {
  return xs
    .map(
      (x, index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)},${ys[index].toFixed(1)}`,
    )
    .join("");
}

function anchorOf(index: number, last: number): "start" | "end" | "middle" {
  if (index === 0) return "start";
  return index === last ? "end" : "middle";
}

function nearestIndex(xs: readonly number[], x: number): number {
  let best = 0;
  for (let index = 1; index < xs.length; index += 1) {
    if (Math.abs(xs[index] - x) < Math.abs(xs[best] - x)) best = index;
  }
  return best;
}

const axisFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumSignificantDigits: 4,
});

/**
 * The fund's value at each close against the benchmark, which starts at the
 * same value. Point, drag a finger or use the arrow keys to read a day. A
 * hidden table holds the values for assistive technology.
 */
export function NavChart({ points }: { points: readonly NavChartPoint[] }) {
  const locale = useLocale();
  const titleId = useId();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = points.flatMap((point) => [point.navGbp, point.benchmarkGbp]);
  const { ticks, low, high } = niceTicks(
    Math.min(...values),
    Math.max(...values),
    4,
  );
  const plotBottom = HEIGHT - AXIS;
  const yOf = (value: number) =>
    plotBottom - ((value - low) / (high - low)) * (plotBottom - TOP);
  const last = points.length - 1;
  const xs = points.map((_, index) =>
    last === 0 ? width / 2 : (index / last) * width,
  );
  const fundYs = points.map((point) => yOf(point.navGbp));
  const benchmarkYs = points.map((point) => yOf(point.benchmarkGbp));
  const shown = points[active ?? last];

  const fundLabel = t({ en: "Fund", zh: "基金" });
  const benchmarkLabel = t({
    en: "Benchmark: half FTSE 100, half S&P 500",
    zh: "基准：一半富时 100，一半标普 500",
  });

  const pickAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(xs, event.clientX - box.left));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -1 : 1;
      setActive((current) =>
        Math.min(Math.max((current ?? last) + step, 0), last),
      );
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const dateLabels =
    width === 0
      ? []
      : [0, Math.round(last / 2), last]
          .filter((index, position, all) => all.indexOf(index) === position)
          .map((index) => ({
            index,
            anchor: anchorOf(index, last),
          }));

  const step = Math.max(Math.ceil(points.length / TABLE_ROWS), 1);
  const tableRows = points.filter((_, index) => (last - index) % step === 0);

  return (
    <figure css={[stack.tight, styles.figure]}>
      <div css={[stack.text, styles.readout]} aria-live="polite">
        <Text as="p" look="caption" tone="muted">
          {displayDate(shown.date, locale, "weekday")}
        </Text>
        <div css={cluster.item}>
          <span css={row.tight}>
            <span aria-hidden css={[styles.key, styles.fundKey]} />
            <Text as="span" look="bodySmall" tone="muted">
              {fundLabel}
            </Text>
            <Text as="span" look="bodySmall" weight="semibold" numeric>
              {formatMoney(shown.navGbp)}
            </Text>
          </span>
          <span css={row.tight}>
            <span aria-hidden css={[styles.key, styles.benchmarkKey]} />
            <Text as="span" look="bodySmall" tone="muted">
              {t({ en: "Benchmark", zh: "基准" })}
            </Text>
            <Text as="span" look="bodySmall" weight="semibold" numeric>
              {formatMoney(shown.benchmarkGbp)}
            </Text>
          </span>
        </div>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${fundLabel}${t({ en: ". ", zh: "。" })}${t({
          en: "Use the arrow keys to read each day.",
          zh: "用方向键逐日查看。",
        })}`}
        css={[corner.radius_2, a11y.focusRing, styles.plot]}
        onPointerDown={pickAt}
        onPointerMove={pickAt}
        onPointerLeave={() => {
          setActive(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setActive(null);
        }}
      >
        <svg
          role="img"
          aria-labelledby={titleId}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${String(width)} ${String(HEIGHT)}`}
          css={styles.svg}
        >
          <title id={titleId}>{benchmarkLabel}</title>
          {width === 0 ? null : (
            <>
              {ticks.map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  x2={width}
                  y1={Math.round(yOf(tick)) + 0.5}
                  y2={Math.round(yOf(tick)) + 0.5}
                  css={styles.gridline}
                />
              ))}
              <path
                d={pathOf(xs, benchmarkYs)}
                css={[styles.line, styles.benchmark]}
              />
              <path d={pathOf(xs, fundYs)} css={[styles.line, styles.fund]} />
              {ticks.map((tick) => (
                <text
                  key={tick}
                  x={0}
                  y={yOf(tick) - 4}
                  css={[
                    typeRole.caption,
                    typeModifier.numeric,
                    styles.axisLabel,
                    styles.tickLabel,
                  ]}
                >
                  {axisFormat.format(tick)}
                </text>
              ))}
              {active === null ? null : (
                <>
                  <line
                    x1={Math.round(xs[active]) + 0.5}
                    x2={Math.round(xs[active]) + 0.5}
                    y1={TOP}
                    y2={plotBottom}
                    css={styles.crosshair}
                  />
                  <circle
                    cx={xs[active]}
                    cy={benchmarkYs[active]}
                    r={4}
                    css={[styles.dot, styles.benchmarkDot]}
                  />
                  <circle
                    cx={xs[active]}
                    cy={fundYs[active]}
                    r={4}
                    css={[styles.dot, styles.fundDot]}
                  />
                </>
              )}
              {dateLabels.map((label) => (
                <text
                  key={label.index}
                  x={xs[label.index]}
                  y={HEIGHT - 4}
                  textAnchor={label.anchor}
                  css={[typeRole.caption, styles.axisLabel]}
                >
                  {displayDate(points[label.index].date, locale, "day")}
                </text>
              ))}
            </>
          )}
        </svg>
      </div>
      <Text as="figcaption" look="caption" tone="muted">
        {benchmarkLabel}
      </Text>
      <div css={a11y.srOnly}>
        <table>
          <caption>{fundLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{t({ en: "Date", zh: "日期" })}</th>
              <th scope="col">{fundLabel}</th>
              <th scope="col">{t({ en: "Benchmark", zh: "基准" })}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((point) => (
              <tr key={point.date}>
                <th scope="row">{point.date}</th>
                <td>{formatMoney(point.navGbp)}</td>
                <td>{formatMoney(point.benchmarkGbp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
