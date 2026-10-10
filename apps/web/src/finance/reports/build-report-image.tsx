import type { CSSProperties, ReactElement } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { categoryLineName } from "../store/category-display-name.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { reportImageCopy } from "./report-image-copy.ts";
import type {
  ReportSide,
  TrendPoint,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

export const REPORT_IMAGE_SIZE = { width: 1080, height: 1350 };

const PADDING = 64;
const CONTENT_WIDTH = REPORT_IMAGE_SIZE.width - PADDING * 2;
const COLUMN_GAP = 48;
const AXIS_WIDTH = 120;
const PLOT_WIDTH = CONTENT_WIDTH - AXIS_WIDTH;
const STROKE = 4;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;
const ACCOUNTS_PER_GROUP = 3;
const TOP_CATEGORIES = 5;

const colors = {
  background: "#F7F6F2",
  ink: "#1C1B19",
  muted: "#6E6B64",
  hairline: "#DEDAD2",
  gain: "#1F7A4D",
  loss: "#B42318",
  average: "#3B7DD8",
  assetBar: "#3D3A35",
  liabilityBar: "#C9C4BA",
};

export interface ReportImageOptions {
  locale: SupportedLocale;
  /** Shows the Accounts under each Group; off by default for privacy. */
  includeNames: boolean;
}

const row: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "baseline",
  justifyContent: "space-between",
};

const column: CSSProperties = { display: "flex", flexDirection: "column" };

const truncate: CSSProperties = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

function signColor(minor: number) {
  if (minor > 0) return colors.gain;
  if (minor < 0) return colors.loss;
  return colors.muted;
}

function chartPaths(trend: readonly TrendPoint[], height: number) {
  const values = trend.flatMap((point) => [
    point.netWorthMinor,
    point.averageMinor,
  ]);
  const low = values.length === 0 ? 0 : Math.min(...values);
  const high = values.length === 0 ? 0 : Math.max(...values);
  const span = high - low || 1;
  const x = (index: number) =>
    trend.length < 2 ? 0 : (index / (trend.length - 1)) * PLOT_WIDTH;
  const y = (value: number) =>
    height - STROKE - ((value - low) / span) * (height - STROKE * 2);
  function path(pick: (point: TrendPoint) => number) {
    const points = trend.map(
      (point, index) => `${x(index).toFixed(1)} ${y(pick(point)).toFixed(1)}`,
    );
    if (points.length === 1) {
      points.push(`${String(PLOT_WIDTH)} ${points[0].split(" ")[1]}`);
    }
    return points.length === 0 ? "" : `M ${points.join(" L ")}`;
  }
  return {
    netWorth: path((point) => point.netWorthMinor),
    average: path((point) => point.averageMinor),
    zeroY: low < 0 && high > 0 ? y(0) : null,
    low,
    high,
  };
}

/**
 * The element tree of a weekly Report's share image, for `ImageResponse`:
 * the net worth and its changes, the trend with its moving average, the
 * Group totals (Accounts too when `includeNames`), the asset and liability
 * shares, and the week's top Categories.
 */
export function buildReportImage(
  data: WeeklyReportData,
  { locale, includeNames }: ReportImageOptions,
): ReactElement {
  const copy = reportImageCopy[locale];
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const change = (minor: number) =>
    formatMoney(minor, currency, locale, { signDisplay: "exceptZero" });
  const compact = (minor: number) =>
    formatMoney(minor, currency, locale, { notation: "compact" });
  const period = formatReportWeek(data.periodStart, data.periodEnd, locale);
  const { assets, liabilities, netWorthMinor } = data.balanceSheet;
  const { previousWeek, yearStart } = data.comparisons;
  const chartHeight = includeNames ? 200 : 260;
  const chart = chartPaths(data.trend, chartHeight);
  const assetShare =
    assets.totalMinor - liabilities.totalMinor === 0
      ? 1
      : assets.totalMinor / (assets.totalMinor - liabilities.totalMinor);
  const percent = new Intl.NumberFormat(locale, { style: "percent" });

  function sideColumn(label: string, side: ReportSide) {
    return (
      <div style={{ ...column, width: COLUMN_WIDTH, gap: 10 }}>
        <div
          style={{
            ...row,
            paddingBottom: 10,
            borderBottom: `2px solid ${colors.ink}`,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          <span>{label}</span>
          <span>{money(side.totalMinor)}</span>
        </div>
        {side.groups.map((group) => {
          const accounts = [...group.accounts].sort(
            (a, b) => Math.abs(b.baseMinor) - Math.abs(a.baseMinor),
          );
          const shown = accounts.slice(0, ACCOUNTS_PER_GROUP);
          const hidden = accounts.length - shown.length;
          return (
            <div key={group.id} style={{ ...column, gap: 4 }}>
              <div style={{ ...row, fontSize: 24, fontWeight: 700 }}>
                <span style={{ ...truncate, maxWidth: COLUMN_WIDTH - 200 }}>
                  {group.name}
                </span>
                <span>{money(group.totalMinor)}</span>
              </div>
              {includeNames
                ? shown.map((account) => (
                    <div
                      key={account.id}
                      style={{ ...row, fontSize: 20, color: colors.muted }}
                    >
                      <span
                        style={{
                          ...truncate,
                          maxWidth: COLUMN_WIDTH - 200,
                          paddingLeft: 16,
                        }}
                      >
                        {account.name}
                      </span>
                      <span>{money(account.baseMinor)}</span>
                    </div>
                  ))
                : null}
              {includeNames && hidden > 0 ? (
                <div
                  style={{
                    display: "flex",
                    paddingLeft: 16,
                    fontSize: 20,
                    color: colors.muted,
                  }}
                >
                  {copy.moreAccounts(hidden)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  const categories = data.spending.byCategory
    .filter((line) => line.amountMinor > 0)
    .slice(0, TOP_CATEGORIES);

  return (
    <div
      style={{
        ...column,
        width: "100%",
        height: "100%",
        padding: PADDING,
        gap: 28,
        backgroundColor: colors.background,
        color: colors.ink,
        fontFamily: "Noto Sans SC",
      }}
    >
      <div style={{ ...row, fontSize: 26, color: colors.muted }}>
        <span style={{ fontWeight: 700, color: colors.ink }}>{copy.title}</span>
        <span>{period}</span>
      </div>

      <div style={{ ...column, gap: 6 }}>
        <span style={{ fontSize: 28, color: colors.muted }}>
          {copy.netWorth}
        </span>
        <span style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>
          {money(netWorthMinor)}
        </span>
        <div style={{ display: "flex", gap: 32, fontSize: 26 }}>
          <span style={{ color: signColor(previousWeek.changeMinor) }}>
            {`${change(previousWeek.changeMinor)} ${copy.vsLastWeek}`}
          </span>
          <span style={{ color: signColor(yearStart.changeMinor) }}>
            {`${change(yearStart.changeMinor)} ${copy.sinceYearStart}`}
          </span>
        </div>
      </div>

      <div style={{ ...column, gap: 10 }}>
        <div style={{ display: "flex", height: chartHeight }}>
          <div
            style={{
              ...column,
              width: AXIS_WIDTH,
              justifyContent: "space-between",
              fontSize: 20,
              color: colors.muted,
            }}
          >
            <span>{compact(chart.high)}</span>
            <span>{compact(chart.low)}</span>
          </div>
          <svg
            width={PLOT_WIDTH}
            height={chartHeight}
            viewBox={`0 0 ${String(PLOT_WIDTH)} ${String(chartHeight)}`}
          >
            {[STROKE, chartHeight - STROKE, chart.zeroY].map((lineY, index) =>
              lineY === null ? null : (
                <line
                  key={index}
                  x1={0}
                  x2={PLOT_WIDTH}
                  y1={lineY}
                  y2={lineY}
                  stroke={colors.hairline}
                  strokeWidth={2}
                />
              ),
            )}
            <path
              d={chart.netWorth}
              fill="none"
              stroke={colors.ink}
              strokeWidth={STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={chart.average}
              fill="none"
              stroke={colors.average}
              strokeWidth={STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div
          style={{
            ...row,
            alignItems: "center",
            paddingLeft: AXIS_WIDTH,
            fontSize: 20,
            color: colors.muted,
          }}
        >
          <span>
            {data.trend.length > 0
              ? displayDay(data.trend[0].day, locale, "dayYear")
              : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[
              { label: copy.netWorth, color: colors.ink },
              { label: copy.average, color: colors.average },
            ].map((item) => (
              <div
                key={item.label}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 28,
                    height: 4,
                    backgroundColor: item.color,
                  }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <span>{displayDay(data.periodEnd, locale, "dayYear")}</span>
        </div>
      </div>

      <div style={{ ...row, alignItems: "flex-start", gap: COLUMN_GAP }}>
        {sideColumn(copy.assets, assets)}
        <div style={{ ...column, width: COLUMN_WIDTH, gap: 28 }}>
          {sideColumn(copy.liabilities, liabilities)}
          <div style={{ ...column, gap: 8 }}>
            <div style={{ display: "flex", height: 20, width: COLUMN_WIDTH }}>
              <div
                style={{
                  display: "flex",
                  width: `${String(Math.round(assetShare * 1000) / 10)}%`,
                  backgroundColor: colors.assetBar,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexGrow: 1,
                  backgroundColor: colors.liabilityBar,
                }}
              />
            </div>
            <div style={{ ...row, fontSize: 20, color: colors.muted }}>
              <span>{`${copy.assets} ${percent.format(assetShare)}`}</span>
              <span>{`${copy.liabilities} ${percent.format(1 - assetShare)}`}</span>
            </div>
          </div>

          <div style={{ ...column, gap: 10 }}>
            <div
              style={{
                ...row,
                paddingBottom: 10,
                borderBottom: `2px solid ${colors.ink}`,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              <span>{copy.spentThisWeek}</span>
              <span>{money(data.spending.totalMinor)}</span>
            </div>
            <span style={{ fontSize: 20, color: colors.muted }}>
              {`${change(data.spending.changeMinor)} ${copy.vsAverage}`}
            </span>
            {categories.length === 0 ? (
              <span style={{ fontSize: 22, color: colors.muted }}>
                {copy.noSpending}
              </span>
            ) : (
              categories.map((line) => (
                <div key={line.id ?? ""} style={{ ...row, fontSize: 22 }}>
                  <span style={{ ...truncate, maxWidth: COLUMN_WIDTH - 200 }}>
                    {categoryLineName(line, copy)}
                  </span>
                  <span>{money(line.amountMinor)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
