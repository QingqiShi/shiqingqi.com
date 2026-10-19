import { gray } from "@tuja/ui/palette/gray.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { red } from "@tuja/ui/palette/red.stylex";
import type { CSSProperties, ReactElement } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { accountDetailLine } from "../accounts/account-detail-line.ts";
import { buildBarGeometry } from "../charts/build-bar-geometry.ts";
import { buildTimeSeriesGeometry } from "../charts/build-time-series-geometry.ts";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercentChange } from "../domain/money/format-percent-change.ts";
import { accountDisplayName } from "../store/account-display-name.ts";
import { categoryLineName } from "../store/category-display-name.ts";
import { assetLiabilitySplit } from "./asset-liability-split.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { formatWeekChange, groupChange, sideChange } from "./group-moves.ts";
import { layoutBars } from "./layout-bars.ts";
import { reportChartSeries } from "./report-chart-series.ts";
import { reportImageCopy, type ReportImageCopy } from "./report-image-copy.ts";
import {
  IMAGE_BLOCK_GAP,
  IMAGE_COLUMN_GAP,
  IMAGE_DONUT_HEIGHT,
  IMAGE_GROUP_NET_ROW_HEIGHT,
  IMAGE_HEADER_GAP,
  IMAGE_HEADER_HEIGHT,
  IMAGE_LEFT_WIDTH,
  IMAGE_PADDING,
  IMAGE_RIGHT_WIDTH,
  IMAGE_RANKED_ROW_GAP,
  IMAGE_TABLE_ROW_HEIGHT,
  IMAGE_TITLE_HEIGHT,
  REPORT_IMAGE_WIDTH,
  reportImageLayout,
} from "./report-image-layout.ts";
import type {
  ReportSide,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

const BALANCE_COLUMN = 180;
const CHANGE_COLUMN = 140;
const AXIS_GUTTER = 104;
const AXIS_LABELS_HEIGHT = 36;
const LINE_WIDTH = 4;
const DONUT_WIDTH = 200;
const DONUT_SIZE = 170;
const DONUT_RING = 34;
const NET_NAME_COLUMN = 110;
const NET_VALUE_COLUMN = 150;
const NET_TRACK_GAP = 16;
const NETS_GAP = 32;
const WEEK_BARS_WIDTH = 300;
const WEEK_BARS_HEIGHT = 140;

const colors = {
  background: gray._97,
  ink: gray._13,
  muted: gray._30,
  faint: gray._50,
  hairline: gray._90,
  band: gray._92,
  subBand: gray._95,
  track: gray._92,
  accent: purple._40,
  liability: gray._60,
  gain: green._30,
  loss: red._30,
};

export interface ReportImageOptions {
  locale: SupportedLocale;
  /** Lists each Account under its Group; off by default for privacy. */
  includeNames: boolean;
}

const row: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
};

const column: CSSProperties = { display: "flex", flexDirection: "column" };

const truncate: CSSProperties = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

interface TableRow {
  kind: "side" | "group" | "account" | "net";
  key: string;
  label: string;
  /** The owner and institution that tell an Account apart. */
  detail?: string;
  valueMinor: number;
  /** The change over the week: what the line added to net worth. */
  changeMinor: number;
}

// Satori calls a component function directly, not in a React render. The
// React Compiler adds a cache hook to each component, and that hook fails
// outside a render. Thus the parts of the image are plain functions.
function signColor(minor: number) {
  if (minor > 0) return colors.gain;
  if (minor < 0) return colors.loss;
  return colors.faint;
}

/** Every line of the balance sheet in order: each side, its Groups, their Accounts when `includeNames`, then net worth. */
function tableRows(
  data: WeeklyReportData,
  copy: ReportImageCopy,
  includeNames: boolean,
): TableRow[] {
  const sides: { key: string; label: string; side: ReportSide }[] = [
    { key: "assets", label: copy.assets, side: data.balanceSheet.assets },
    {
      key: "liabilities",
      label: copy.liabilities,
      side: data.balanceSheet.liabilities,
    },
  ];
  return [
    ...sides.flatMap(({ key, label, side }) => [
      {
        kind: "side" as const,
        key,
        label,
        valueMinor: side.totalMinor,
        changeMinor: sideChange(side),
      },
      ...side.groups.flatMap((group) => [
        {
          kind: "group" as const,
          key: group.id,
          label: group.name,
          valueMinor: group.totalMinor,
          changeMinor: groupChange(group),
        },
        ...(includeNames
          ? group.accounts.map((account) => ({
              kind: "account" as const,
              key: account.id,
              label: accountDisplayName(account, copy),
              detail: accountDetailLine(account, account.ownerName),
              valueMinor: account.baseMinor,
              changeMinor: account.baseMinor - account.previousBaseMinor,
            }))
          : []),
      ]),
    ]),
    {
      kind: "net",
      key: "net",
      label: copy.netWorth,
      valueMinor: data.balanceSheet.netWorthMinor,
      changeMinor: data.comparisons.previousWeek.changeMinor,
    },
  ];
}

/** Lines with a name, an amount and a bar against the largest amount, such as the top categories. */
function rankedList(
  lines: readonly { key: string; label: string; amountMinor: number }[],
  width: number,
  money: (minor: number) => string,
) {
  const largest = Math.max(...lines.map((line) => line.amountMinor), 1);
  return (
    <div style={{ ...column, width, gap: IMAGE_RANKED_ROW_GAP }}>
      {lines.map((line) => (
        <div key={line.key} style={{ ...column, gap: 6 }}>
          <div style={{ ...row, fontSize: 21 }}>
            <span style={{ ...truncate, maxWidth: width - 150 }}>
              {line.label}
            </span>
            <span>{money(line.amountMinor)}</span>
          </div>
          <div
            style={{
              display: "flex",
              width,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.track,
            }}
          >
            <div
              style={{
                display: "flex",
                width: (line.amountMinor / largest) * width,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function sectionTitle(title: string, aside?: ReactElement) {
  return (
    <div
      style={{
        ...row,
        alignItems: "baseline",
        height: IMAGE_TITLE_HEIGHT - 16,
        marginBottom: 16,
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      <span>{title}</span>
      {aside}
    </div>
  );
}

/** An arc of a ring from `start` to `end`, as shares of a full turn clockwise from the top. */
function arcPath(start: number, end: number, radius: number, centre: number) {
  const point = (share: number) => {
    const angle = share * Math.PI * 2 - Math.PI / 2;
    return `${(centre + radius * Math.cos(angle)).toFixed(2)} ${(centre + radius * Math.sin(angle)).toFixed(2)}`;
  };
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${point(start)} A ${String(radius)} ${String(radius)} 0 ${String(large)} 1 ${point(end)}`;
}

/**
 * The element tree of a weekly Report's share image, for `ImageResponse`,
 * laid out like the household's own sheet: the net worth and how it changed
 * in the header; the balance sheet with each line's change over the week
 * (the Accounts too when `includeNames`) on the left; the whole net-worth
 * trend, the net of each Group family, assets against liabilities and the
 * week's spending on the right. The image grows taller with the balance
 * sheet, so nothing is cut; its size comes with it.
 */
export function buildReportImage(
  data: WeeklyReportData,
  { locale, includeNames }: ReportImageOptions,
): { element: ReactElement; width: number; height: number } {
  const copy = reportImageCopy[locale];
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const change = (minor: number) => formatWeekChange(minor, currency, locale);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const period = formatReportWeek(data.periodStart, data.periodEnd, locale);
  const { previousWeek, yearStart } = data.comparisons;
  const weekPercent = formatPercentChange(
    previousWeek.changeMinor,
    previousWeek.netWorthMinor,
    locale,
  );

  const rows = tableRows(data, copy, includeNames);
  const nets = data.groupNets;
  const spentCategories = data.spending.byCategory.filter(
    (line) => line.amountMinor > 0,
  );
  const layout = reportImageLayout({
    tableRows: rows.length,
    groupNets: nets.length,
    categories: spentCategories.length,
    payees: data.topPayees.length,
  });

  const header = (
    <div
      style={{
        ...row,
        alignItems: "flex-end",
        height: IMAGE_HEADER_HEIGHT,
        paddingBottom: 24,
        borderBottom: `4px solid ${colors.ink}`,
      }}
    >
      <div style={{ ...column, gap: 4 }}>
        <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
          {copy.title}
        </span>
        <span style={{ fontSize: 26, color: colors.muted }}>{period}</span>
      </div>
      <div style={{ ...column, alignItems: "flex-end", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={{ fontSize: 26, color: colors.muted }}>
            {copy.netWorth}
          </span>
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {money(data.balanceSheet.netWorthMinor)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 24 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontWeight: 700,
                color: signColor(previousWeek.changeMinor),
              }}
            >
              {weekPercent === null
                ? change(previousWeek.changeMinor)
                : `${change(previousWeek.changeMinor)} (${weekPercent})`}
            </span>
            <span style={{ color: colors.muted }}>{copy.vsLastWeek}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontWeight: 700,
                color: signColor(yearStart.changeMinor),
              }}
            >
              {change(yearStart.changeMinor)}
            </span>
            <span style={{ color: colors.muted }}>{copy.sinceYearStart}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const rowStyle = (kind: TableRow["kind"]): CSSProperties => {
    switch (kind) {
      case "side":
        return { backgroundColor: colors.band, fontWeight: 700 };
      case "group":
        return {
          backgroundColor: colors.subBand,
          fontWeight: 600,
          paddingLeft: 32,
        };
      case "account":
        return {
          paddingLeft: 56,
          borderBottom: `1px solid ${colors.hairline}`,
        };
      case "net":
        return { fontWeight: 700, borderTop: `3px solid ${colors.ink}` };
    }
  };
  const balanceSheet = (
    <div style={{ ...column, width: IMAGE_LEFT_WIDTH }}>
      {sectionTitle(copy.balanceSheet)}
      <div
        style={{
          ...row,
          height: IMAGE_TABLE_ROW_HEIGHT,
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: `2px solid ${colors.ink}`,
          fontSize: 20,
          color: colors.muted,
        }}
      >
        <span style={{ flexGrow: 1 }}>
          {includeNames ? copy.account : copy.group}
        </span>
        <span style={{ width: BALANCE_COLUMN, justifyContent: "flex-end" }}>
          {copy.balance}
        </span>
        <span style={{ width: CHANGE_COLUMN, justifyContent: "flex-end" }}>
          {copy.thisWeek}
        </span>
      </div>
      {rows.map((line) => (
        <div
          key={`${line.kind}-${line.key}`}
          style={{
            ...row,
            height: IMAGE_TABLE_ROW_HEIGHT,
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: line.kind === "account" ? 21 : 22,
            ...rowStyle(line.kind),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
            }}
          >
            <span style={{ ...truncate, flexShrink: 0, maxWidth: "70%" }}>
              {line.label}
            </span>
            {line.detail ? (
              <span
                style={{
                  ...truncate,
                  flexShrink: 1,
                  minWidth: 0,
                  fontSize: 17,
                  color: colors.faint,
                }}
              >
                {line.detail}
              </span>
            ) : null}
          </div>
          <span style={{ width: BALANCE_COLUMN, justifyContent: "flex-end" }}>
            {money(line.valueMinor)}
          </span>
          <span
            style={{
              width: CHANGE_COLUMN,
              justifyContent: "flex-end",
              color: signColor(line.changeMinor),
              fontWeight: line.kind === "account" ? 400 : 600,
            }}
          >
            {change(line.changeMinor)}
          </span>
        </div>
      ))}
    </div>
  );

  const trendHeight = layout.trendHeight - IMAGE_TITLE_HEIGHT;
  const plotWidth = IMAGE_RIGHT_WIDTH - AXIS_GUTTER;
  const plotHeight = trendHeight - AXIS_LABELS_HEIGHT;
  const series = reportChartSeries(data.trend, "netWorth");
  const geometry =
    series === null || data.trend.length < 2
      ? null
      : buildTimeSeriesGeometry({
          series,
          trend: Float64Array.from(data.trend, (point) => point.averageMinor),
          width: plotWidth,
          top: LINE_WIDTH * 2,
          bottom: plotHeight - LINE_WIDTH,
          tickCount: 5,
          dateSpacing: 120,
        });
  const yStep =
    geometry === null || geometry.yTicks.length < 2
      ? 0
      : geometry.yTicks[1].value - geometry.yTicks[0].value;
  const trend = (
    <div style={{ ...column, height: layout.trendHeight }}>
      {sectionTitle(
        copy.trend,
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 22,
            fontWeight: 400,
            color: colors.muted,
          }}
        >
          {[
            { label: copy.netWorth, color: colors.accent, opacity: 1 },
            { label: copy.average, color: colors.muted, opacity: 0.6 },
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
                  borderRadius: 2,
                  backgroundColor: item.color,
                  opacity: item.opacity,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>,
      )}
      {geometry === null ? null : (
        <div
          style={{
            display: "flex",
            position: "relative",
            width: IMAGE_RIGHT_WIDTH,
            height: trendHeight,
          }}
        >
          <svg
            width={plotWidth}
            height={plotHeight}
            viewBox={`0 0 ${String(plotWidth)} ${String(plotHeight)}`}
            style={{ position: "absolute", left: AXIS_GUTTER, top: 0 }}
          >
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors.accent} stopOpacity={0.18} />
                <stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            {geometry.yTicks.map((tick) => (
              <line
                key={tick.y}
                x1={0}
                x2={plotWidth}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.hairline}
                strokeWidth={2}
              />
            ))}
            {geometry.xTicks.map((tick) => (
              <line
                key={tick.epochDay}
                x1={tick.x}
                x2={tick.x}
                y1={0}
                y2={plotHeight}
                stroke={colors.hairline}
                strokeWidth={2}
              />
            ))}
            {geometry.zeroY === null ? null : (
              <line
                x1={0}
                x2={plotWidth}
                y1={geometry.zeroY}
                y2={geometry.zeroY}
                stroke={colors.ink}
                strokeWidth={2}
              />
            )}
            <path d={geometry.area} fill="url(#area)" />
            <path
              d={geometry.trendLine}
              fill="none"
              stroke={colors.muted}
              strokeOpacity={0.6}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={geometry.line}
              fill="none"
              stroke={colors.accent}
              strokeWidth={LINE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          {geometry.yTicks.map((tick) => (
            <span
              key={tick.y}
              style={{
                position: "absolute",
                left: 0,
                width: AXIS_GUTTER - 14,
                top: tick.y - 14,
                justifyContent: "flex-end",
                fontSize: 20,
                color: colors.muted,
              }}
            >
              {formatAxisMoney(tick.value, yStep, currency, locale)}
            </span>
          ))}
          {geometry.xTicks.map((tick) => (
            <span
              key={tick.epochDay}
              style={{
                position: "absolute",
                left: AXIS_GUTTER + tick.x - 80,
                width: 160,
                top: plotHeight + 8,
                justifyContent: "center",
                fontSize: 20,
                color: colors.muted,
              }}
            >
              {displayDay(tick.epochDay, locale, tick.unit)}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const netTrack =
    IMAGE_RIGHT_WIDTH -
    DONUT_WIDTH -
    NETS_GAP -
    NET_NAME_COLUMN -
    NET_VALUE_COLUMN -
    NET_TRACK_GAP * 2;
  const netBars = layoutBars(nets.map((net) => net.valueMinor));
  const netZero = netBars.zero * netTrack;
  const split = assetLiabilitySplit(data.balanceSheet);
  const ringRadius = (DONUT_SIZE - DONUT_RING) / 2;
  const ringCentre = DONUT_SIZE / 2;
  const groupNets = (
    <div style={{ ...column, height: layout.groupNetsHeight }}>
      {sectionTitle(copy.groupNets)}
      <div style={{ ...row, alignItems: "flex-start", gap: NETS_GAP }}>
        <div style={{ ...column, flexGrow: 1 }}>
          {nets.map((net, index) => {
            const size = Math.max(netBars.bars[index].size * netTrack, 3);
            return (
              <div
                key={net.groupIds.join()}
                style={{
                  ...row,
                  gap: NET_TRACK_GAP,
                  height: IMAGE_GROUP_NET_ROW_HEIGHT,
                  fontSize: 21,
                }}
              >
                <span style={{ ...truncate, width: NET_NAME_COLUMN }}>
                  {net.name}
                </span>
                <div
                  style={{
                    display: "flex",
                    position: "relative",
                    width: netTrack,
                    height: IMAGE_GROUP_NET_ROW_HEIGHT,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      position: "absolute",
                      left: netZero - 1,
                      top: 0,
                      width: 2,
                      height: IMAGE_GROUP_NET_ROW_HEIGHT,
                      backgroundColor: colors.faint,
                    }}
                  />
                  {net.valueMinor === 0 ? null : (
                    <div
                      style={{
                        display: "flex",
                        position: "absolute",
                        top: 10,
                        height: IMAGE_GROUP_NET_ROW_HEIGHT - 20,
                        width: size,
                        left:
                          net.valueMinor > 0 ? netZero + 1 : netZero - 1 - size,
                        borderRadius: 3,
                        backgroundColor:
                          net.valueMinor > 0 ? colors.accent : colors.liability,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    width: NET_VALUE_COLUMN,
                    justifyContent: "flex-end",
                  }}
                >
                  {money(net.valueMinor)}
                </span>
              </div>
            );
          })}
        </div>
        {split.assetsMinor + split.liabilitiesMinor === 0 ? null : (
          <div
            style={{
              ...column,
              alignItems: "center",
              width: DONUT_WIDTH,
              height: IMAGE_DONUT_HEIGHT,
              gap: 20,
            }}
          >
            <svg
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              viewBox={`0 0 ${String(DONUT_SIZE)} ${String(DONUT_SIZE)}`}
            >
              {split.liabilityShare === 0 || split.assetShare === 0 ? (
                <circle
                  cx={ringCentre}
                  cy={ringCentre}
                  r={ringRadius}
                  fill="none"
                  strokeWidth={DONUT_RING}
                  stroke={
                    split.assetShare > 0 ? colors.accent : colors.liability
                  }
                />
              ) : (
                [
                  { from: 0, to: split.assetShare, color: colors.accent },
                  { from: split.assetShare, to: 1, color: colors.liability },
                ].map((part) => (
                  <path
                    key={part.color}
                    d={arcPath(part.from, part.to, ringRadius, ringCentre)}
                    fill="none"
                    strokeWidth={DONUT_RING}
                    stroke={part.color}
                  />
                ))
              )}
            </svg>
            <div style={{ ...column, width: DONUT_WIDTH, gap: 10 }}>
              {[
                {
                  label: copy.assets,
                  share: split.assetShare,
                  minor: split.assetsMinor,
                  color: colors.accent,
                },
                {
                  label: copy.liabilities,
                  share: split.liabilityShare,
                  minor: split.liabilitiesMinor,
                  color: colors.liability,
                },
              ].map((part) => (
                <div key={part.label} style={{ ...column, fontSize: 20 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        backgroundColor: part.color,
                      }}
                    />
                    <span style={{ color: colors.muted }}>{part.label}</span>
                    <span style={{ fontWeight: 700 }}>
                      {percent.format(part.share)}
                    </span>
                  </div>
                  <span style={{ paddingLeft: 24 }}>{money(part.minor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const { spending } = data;
  const spendingWidth =
    layout.spendingColumn === "left" ? IMAGE_LEFT_WIDTH : IMAGE_RIGHT_WIDTH;
  const weeks = spending.history;
  const weekBars = buildBarGeometry({
    periodCount: weeks.length,
    series: [{ values: weeks.map((week) => week.totalMinor) }],
    layout: "stacked",
    plotRight: WEEK_BARS_WIDTH,
    top: 0,
    bottom: WEEK_BARS_HEIGHT,
    tickCount: 3,
    alsoShow: [spending.averageMinor],
    partial: weeks.map((_week, index) => (index < weeks.length - 1 ? 1 : 0)),
  });
  const categories = spentCategories.slice(0, layout.categories);
  const categoriesWidth = spendingWidth - WEEK_BARS_WIDTH - 40;
  const spendingBlock = (
    <div
      style={{
        ...column,
        width: spendingWidth,
        height: layout.spendingHeight,
      }}
    >
      {sectionTitle(
        copy.spentThisWeek,
        <span style={{ color: colors.ink }}>{money(spending.totalMinor)}</span>,
      )}
      <span style={{ fontSize: 21, color: colors.muted, marginBottom: 20 }}>
        {[
          `${change(spending.changeMinor)} ${copy.vsAverage}`,
          `${copy.income} ${money(data.incomeMinor)}`,
        ].join(" · ")}
      </span>
      <div style={{ ...row, alignItems: "flex-start", gap: 40 }}>
        <div style={{ ...column, gap: 10 }}>
          <svg
            width={WEEK_BARS_WIDTH}
            height={WEEK_BARS_HEIGHT}
            viewBox={`0 0 ${String(WEEK_BARS_WIDTH)} ${String(WEEK_BARS_HEIGHT)}`}
          >
            <path
              d={weekBars.partialPaths[0]}
              fill={colors.accent}
              fillOpacity={0.35}
            />
            <path d={weekBars.paths[0]} fill={colors.accent} />
            {weeks.length < 2 ? null : (
              <line
                x1={0}
                x2={WEEK_BARS_WIDTH}
                y1={weekBars.y(spending.averageMinor)}
                y2={weekBars.y(spending.averageMinor)}
                stroke={colors.ink}
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            )}
          </svg>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 19,
              color: colors.muted,
            }}
          >
            <svg width={24} height={4} viewBox="0 0 24 4">
              <line
                x1={0}
                x2={24}
                y1={2}
                y2={2}
                stroke={colors.ink}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </svg>
            <span>{`${copy.fourWeekAverage} ${money(spending.averageMinor)}`}</span>
          </div>
        </div>
        <div style={{ ...column, width: categoriesWidth, gap: 12 }}>
          {categories.length === 0 ? (
            <span style={{ fontSize: 21, color: colors.muted }}>
              {copy.noSpending}
            </span>
          ) : (
            rankedList(
              categories.map((line) => ({
                key: line.id ?? "",
                label: categoryLineName(line, copy),
                amountMinor: line.amountMinor,
              })),
              categoriesWidth,
              money,
            )
          )}
        </div>
      </div>
    </div>
  );

  const payeesBlock =
    layout.payees === 0 ? null : (
      <div style={{ ...column, width: spendingWidth }}>
        {sectionTitle(copy.topPayees)}
        {rankedList(
          data.topPayees.slice(0, layout.payees).map((payee) => ({
            key: payee.id,
            label: payee.name,
            amountMinor: payee.amountMinor,
          })),
          spendingWidth,
          money,
        )}
      </div>
    );

  const element = (
    <div
      style={{
        ...column,
        width: "100%",
        height: "100%",
        padding: IMAGE_PADDING,
        backgroundColor: colors.background,
        color: colors.ink,
        fontFamily: "Noto Sans SC",
      }}
    >
      {header}
      <div
        style={{
          ...row,
          alignItems: "flex-start",
          gap: IMAGE_COLUMN_GAP,
          marginTop: IMAGE_HEADER_GAP,
        }}
      >
        <div
          style={{ ...column, gap: IMAGE_BLOCK_GAP, width: IMAGE_LEFT_WIDTH }}
        >
          {balanceSheet}
          {layout.spendingColumn === "left" ? spendingBlock : null}
          {layout.spendingColumn === "left" ? payeesBlock : null}
        </div>
        <div
          style={{ ...column, gap: IMAGE_BLOCK_GAP, width: IMAGE_RIGHT_WIDTH }}
        >
          {trend}
          {groupNets}
          {layout.spendingColumn === "right" ? spendingBlock : null}
          {layout.spendingColumn === "right" ? payeesBlock : null}
        </div>
      </div>
    </div>
  );
  return { element, width: REPORT_IMAGE_WIDTH, height: layout.height };
}
