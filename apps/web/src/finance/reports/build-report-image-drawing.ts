import { gray } from "@tuja/ui/palette/gray.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { red } from "@tuja/ui/palette/red.stylex";
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
import {
  IMAGE_BLOCK_GAP,
  IMAGE_COLUMN_GAP,
  IMAGE_GROUP_NET_ROW_HEIGHT,
  IMAGE_HEADER_GAP,
  IMAGE_HEADER_HEIGHT,
  IMAGE_LEFT_WIDTH,
  IMAGE_PADDING,
  IMAGE_RANKED_ROW_HEIGHT,
  IMAGE_RIGHT_WIDTH,
  IMAGE_SPENDING_HEAD_HEIGHT,
  IMAGE_TABLE_ROW_HEIGHT,
  IMAGE_TITLE_HEIGHT,
  REPORT_IMAGE_WIDTH,
  reportImageLayout,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
import type {
  ReportSide,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

export interface ReportImageFont {
  size: number;
  weight: 400 | 600 | 700;
}

/** The width of `text` in `font`, in pixels. */
export type MeasureText = (text: string, font: ReportImageFont) => number;

/** A fill or stroke colour; a gradient runs down the path from `y0` to `y1`. */
export type ReportImagePaint =
  | string
  | {
      y0: number;
      y1: number;
      stops: { offset: number; color: string }[];
    };

export type ReportImageCommand =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      radius?: number;
    }
  | {
      kind: "path";
      /** SVG path data, drawn with its origin at `x`, `y`. */
      d: string;
      x: number;
      y: number;
      fill?: ReportImagePaint;
      stroke?: {
        color: string;
        width: number;
        dash?: number[];
        round?: boolean;
      };
    }
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      font: ReportImageFont;
      color: string;
      align: "left" | "right" | "center";
      /** `alphabetic` puts the baseline on `y`; `middle` centres the line on it. */
      baseline: "alphabetic" | "middle";
    };

export interface ReportImageDrawing {
  width: number;
  height: number;
  commands: ReportImageCommand[];
}

export interface ReportImageOptions {
  locale: SupportedLocale;
  /** Lists each Account under its Group; off by default for privacy. */
  includeNames: boolean;
}

const BALANCE_COLUMN = 180;
const CHANGE_COLUMN = 140;
const TABLE_INSET = 16;
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
const NET_LIST_WIDTH = IMAGE_RIGHT_WIDTH - DONUT_WIDTH - NETS_GAP;
const WEEK_BARS_WIDTH = 300;
const WEEK_BARS_HEIGHT = 140;
const SPENDING_GAP = 40;
const RANKED_TEXT_HEIGHT = 30;
const BAR_HEIGHT = 6;

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

/** `color` (#RRGGBB) at `opacity`, as #RRGGBBAA. */
function withOpacity(color: string, opacity: number) {
  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function signColor(minor: number) {
  if (minor > 0) return colors.gain;
  if (minor < 0) return colors.loss;
  return colors.faint;
}

/** How each kind of balance-sheet line looks: its indent, type and band. */
const ROW_STYLE: Record<
  TableRow["kind"],
  {
    inset: number;
    size: number;
    weight: ReportImageFont["weight"];
    changeWeight: ReportImageFont["weight"];
    band?: string;
  }
> = {
  side: {
    inset: 16,
    size: 22,
    weight: 700,
    changeWeight: 600,
    band: colors.band,
  },
  group: {
    inset: 32,
    size: 22,
    weight: 600,
    changeWeight: 600,
    band: colors.subBand,
  },
  account: { inset: 56, size: 21, weight: 400, changeWeight: 400 },
  net: { inset: 16, size: 22, weight: 700, changeWeight: 600 },
};

interface TableRow {
  kind: "side" | "group" | "account" | "net";
  label: string;
  /** The owner and institution that tell an Account apart. */
  detail?: string;
  valueMinor: number;
  /** The change over the week: what the line added to net worth. */
  changeMinor: number;
}

/** Every line of the balance sheet in order: each side, its Groups, their Accounts when `includeNames`, then net worth. */
function tableRows(
  data: WeeklyReportData,
  copy: ReportImageCopy,
  includeNames: boolean,
): TableRow[] {
  const sides: { label: string; side: ReportSide }[] = [
    { label: copy.assets, side: data.balanceSheet.assets },
    { label: copy.liabilities, side: data.balanceSheet.liabilities },
  ];
  return [
    ...sides.flatMap(({ label, side }) => [
      {
        kind: "side" as const,
        label,
        valueMinor: side.totalMinor,
        changeMinor: sideChange(side),
      },
      ...side.groups.flatMap((group) => [
        {
          kind: "group" as const,
          label: group.name,
          valueMinor: group.totalMinor,
          changeMinor: groupChange(group),
        },
        ...(includeNames
          ? group.accounts.map((account) => ({
              kind: "account" as const,
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
      label: copy.netWorth,
      valueMinor: data.balanceSheet.netWorthMinor,
      changeMinor: data.comparisons.previousWeek.changeMinor,
    },
  ];
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

function linePath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${String(x1)} ${String(y1)} L ${String(x2)} ${String(y2)}`;
}

/**
 * The draw commands of a weekly Report's share image, laid out like the
 * household's own sheet: the net worth and how it changed in the header; the
 * balance sheet with each line's change over the week (the Accounts too when
 * `includeNames`) on the left; the whole net-worth trend, the net of each
 * Group family, assets against liabilities and the week's spending on the
 * right. The image grows taller with the balance sheet, so nothing is cut.
 */
export function buildReportImageDrawing(
  data: WeeklyReportData,
  {
    locale,
    includeNames,
    copy,
    measureText,
  }: ReportImageOptions & { copy: ReportImageCopy; measureText: MeasureText },
): ReportImageDrawing {
  const commands: ReportImageCommand[] = [];
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const change = (minor: number) => formatWeekChange(minor, currency, locale);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  function rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    radius?: number,
  ) {
    commands.push({ kind: "rect", x, y, width, height, color, radius });
  }

  function text(
    value: string,
    x: number,
    y: number,
    font: ReportImageFont,
    color: string,
    {
      align = "left",
      baseline = "middle",
      maxWidth,
    }: {
      align?: "left" | "right" | "center";
      baseline?: "alphabetic" | "middle";
      maxWidth?: number;
    } = {},
  ) {
    const fitted = maxWidth === undefined ? value : fit(value, font, maxWidth);
    if (fitted === "") return 0;
    commands.push({
      kind: "text",
      text: fitted,
      x,
      y,
      font,
      color,
      align,
      baseline,
    });
    return measureText(fitted, font);
  }

  /** `value`, cut short with an ellipsis when it is wider than `maxWidth`. */
  function fit(value: string, font: ReportImageFont, maxWidth: number) {
    if (measureText(value, font) <= maxWidth) return value;
    const characters = Array.from(value);
    let low = 0;
    let high = characters.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const candidate = `${characters.slice(0, middle).join("").trimEnd()}…`;
      if (measureText(candidate, font) <= maxWidth) low = middle;
      else high = middle - 1;
    }
    return low === 0 ? "" : `${characters.slice(0, low).join("").trimEnd()}…`;
  }

  /** A section title; returns its baseline, for text at the right end of its line. */
  function sectionTitle(title: string, x: number, y: number) {
    const baseline = y + 27;
    text(title, x, baseline, { size: 26, weight: 700 }, colors.ink, {
      baseline: "alphabetic",
    });
    return baseline;
  }

  function path(
    d: string,
    x: number,
    y: number,
    style: Pick<
      Extract<ReportImageCommand, { kind: "path" }>,
      "fill" | "stroke"
    >,
  ) {
    commands.push({ kind: "path", d, x, y, ...style });
  }

  /** Lines with a name, an amount and a bar against the largest amount, such as the top categories. */
  function rankedList(
    lines: readonly { label: string; amountMinor: number }[],
    x: number,
    y: number,
    width: number,
  ) {
    const largest = Math.max(...lines.map((line) => line.amountMinor), 1);
    const font = { size: 21, weight: 400 } as const;
    lines.forEach((line, index) => {
      const top = y + index * IMAGE_RANKED_ROW_HEIGHT;
      const middle = top + RANKED_TEXT_HEIGHT / 2;
      text(line.label, x, middle, font, colors.ink, { maxWidth: width - 150 });
      text(money(line.amountMinor), x + width, middle, font, colors.ink, {
        align: "right",
      });
      const barTop = top + RANKED_TEXT_HEIGHT + 6;
      rect(x, barTop, width, BAR_HEIGHT, colors.track, BAR_HEIGHT / 2);
      const filled = (line.amountMinor / largest) * width;
      if (filled > 0) {
        rect(x, barTop, filled, BAR_HEIGHT, colors.accent, BAR_HEIGHT / 2);
      }
    });
  }

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
  const contentWidth = REPORT_IMAGE_WIDTH - IMAGE_PADDING * 2;
  const left = IMAGE_PADDING;
  const right = IMAGE_PADDING + IMAGE_LEFT_WIDTH + IMAGE_COLUMN_GAP;
  const contentRight = IMAGE_PADDING + contentWidth;

  rect(0, 0, REPORT_IMAGE_WIDTH, layout.height, colors.background);

  // Header: the title and week on the left, the net worth and its changes on the right.
  const headerTop = IMAGE_PADDING;
  const headerBottom = headerTop + IMAGE_HEADER_HEIGHT;
  rect(left, headerBottom - 4, contentWidth, 4, colors.ink);
  text(copy.title, left, headerTop + 34, { size: 56, weight: 700 }, colors.ink);
  text(
    formatReportWeek(data.periodStart, data.periodEnd, locale),
    left,
    headerTop + 84,
    { size: 26, weight: 400 },
    colors.muted,
  );
  const netWorthWidth = text(
    money(data.balanceSheet.netWorthMinor),
    contentRight,
    headerTop + 52,
    { size: 60, weight: 700 },
    colors.ink,
    { align: "right", baseline: "alphabetic" },
  );
  text(
    copy.netWorth,
    contentRight - netWorthWidth - 20,
    headerTop + 52,
    { size: 26, weight: 400 },
    colors.muted,
    { align: "right", baseline: "alphabetic" },
  );
  const { previousWeek, yearStart } = data.comparisons;
  const weekPercent = formatPercentChange(
    previousWeek.changeMinor,
    previousWeek.netWorthMinor,
    locale,
  );
  const changesFromRight = [
    {
      value: change(yearStart.changeMinor),
      minor: yearStart.changeMinor,
      label: copy.sinceYearStart,
    },
    {
      value:
        weekPercent === null
          ? change(previousWeek.changeMinor)
          : `${change(previousWeek.changeMinor)} (${weekPercent})`,
      minor: previousWeek.changeMinor,
      label: copy.vsLastWeek,
    },
  ];
  let changeRight = contentRight;
  for (const item of changesFromRight) {
    const labelWidth = text(
      item.label,
      changeRight,
      headerTop + 86,
      { size: 24, weight: 400 },
      colors.muted,
      { align: "right" },
    );
    const valueWidth = text(
      item.value,
      changeRight - labelWidth - 8,
      headerTop + 86,
      { size: 24, weight: 700 },
      signColor(item.minor),
      { align: "right" },
    );
    changeRight -= labelWidth + 8 + valueWidth + 28;
  }

  const bodyTop = headerBottom + IMAGE_HEADER_GAP;

  // Balance sheet.
  sectionTitle(copy.balanceSheet, left, bodyTop);
  const tableTop = bodyTop + IMAGE_TITLE_HEIGHT;
  const changeColumnRight = left + IMAGE_LEFT_WIDTH - TABLE_INSET;
  const balanceColumnRight = changeColumnRight - CHANGE_COLUMN;
  const headFont = { size: 20, weight: 400 } as const;
  const headMiddle = tableTop + IMAGE_TABLE_ROW_HEIGHT / 2;
  text(
    includeNames ? copy.account : copy.group,
    left + TABLE_INSET,
    headMiddle,
    headFont,
    colors.muted,
  );
  text(copy.balance, balanceColumnRight, headMiddle, headFont, colors.muted, {
    align: "right",
  });
  text(copy.thisWeek, changeColumnRight, headMiddle, headFont, colors.muted, {
    align: "right",
  });
  rect(
    left,
    tableTop + IMAGE_TABLE_ROW_HEIGHT - 2,
    IMAGE_LEFT_WIDTH,
    2,
    colors.ink,
  );
  rows.forEach((line, index) => {
    const top = tableTop + IMAGE_TABLE_ROW_HEIGHT * (index + 1);
    const baseline = top + 28;
    const { inset, size, weight, changeWeight, band } = ROW_STYLE[line.kind];
    if (band) rect(left, top, IMAGE_LEFT_WIDTH, IMAGE_TABLE_ROW_HEIGHT, band);
    if (line.kind === "account") {
      rect(
        left,
        top + IMAGE_TABLE_ROW_HEIGHT - 1,
        IMAGE_LEFT_WIDTH,
        1,
        colors.hairline,
      );
    }
    if (line.kind === "net") rect(left, top, IMAGE_LEFT_WIDTH, 3, colors.ink);
    const font = { size, weight };
    const nameSpace =
      IMAGE_LEFT_WIDTH - inset - TABLE_INSET - BALANCE_COLUMN - CHANGE_COLUMN;
    const labelWidth = text(
      line.label,
      left + inset,
      baseline,
      font,
      colors.ink,
      { baseline: "alphabetic", maxWidth: nameSpace * 0.7 },
    );
    if (line.detail) {
      text(
        line.detail,
        left + inset + labelWidth + 12,
        baseline,
        { size: 17, weight: 400 },
        colors.faint,
        { baseline: "alphabetic", maxWidth: nameSpace - labelWidth - 24 },
      );
    }
    text(
      money(line.valueMinor),
      balanceColumnRight,
      baseline,
      font,
      colors.ink,
      {
        align: "right",
        baseline: "alphabetic",
      },
    );
    text(
      change(line.changeMinor),
      changeColumnRight,
      baseline,
      { size, weight: changeWeight },
      signColor(line.changeMinor),
      { align: "right", baseline: "alphabetic" },
    );
  });

  // Net-worth trend.
  const trendBaseline = sectionTitle(copy.trend, right, bodyTop);
  let legendRight = contentRight;
  const legendFromRight = [
    { label: copy.average, color: withOpacity(colors.muted, 0.6) },
    { label: copy.netWorth, color: colors.accent },
  ];
  for (const item of legendFromRight) {
    const width = text(
      item.label,
      legendRight,
      trendBaseline,
      { size: 22, weight: 400 },
      colors.muted,
      { align: "right", baseline: "alphabetic" },
    );
    rect(
      legendRight - width - 10 - 28,
      trendBaseline - 9,
      28,
      4,
      item.color,
      2,
    );
    legendRight -= width + 10 + 28 + 24;
  }
  const chartTop = bodyTop + IMAGE_TITLE_HEIGHT;
  const plotLeft = right + AXIS_GUTTER;
  const plotWidth = IMAGE_RIGHT_WIDTH - AXIS_GUTTER;
  const plotHeight =
    layout.trendHeight - IMAGE_TITLE_HEIGHT - AXIS_LABELS_HEIGHT;
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
  if (geometry !== null) {
    const yStep =
      geometry.yTicks.length < 2
        ? 0
        : geometry.yTicks[1].value - geometry.yTicks[0].value;
    const plot = (d: string, style: Parameters<typeof path>[3]) => {
      path(d, plotLeft, chartTop, style);
    };
    const gridLine = { stroke: { color: colors.hairline, width: 2 } };
    for (const tick of geometry.yTicks) {
      plot(linePath(0, tick.y, plotWidth, tick.y), gridLine);
    }
    for (const tick of geometry.xTicks) {
      plot(linePath(tick.x, 0, tick.x, plotHeight), gridLine);
    }
    if (geometry.zeroY !== null) {
      plot(linePath(0, geometry.zeroY, plotWidth, geometry.zeroY), {
        stroke: { color: colors.ink, width: 2 },
      });
    }
    plot(geometry.area, {
      fill: {
        y0: 0,
        y1: plotHeight,
        stops: [
          { offset: 0, color: withOpacity(colors.accent, 0.18) },
          { offset: 1, color: withOpacity(colors.accent, 0) },
        ],
      },
    });
    plot(geometry.trendLine, {
      stroke: { color: withOpacity(colors.muted, 0.6), width: 3, round: true },
    });
    plot(geometry.line, {
      stroke: { color: colors.accent, width: LINE_WIDTH, round: true },
    });
    const axisFont = { size: 20, weight: 400 } as const;
    for (const tick of geometry.yTicks) {
      text(
        formatAxisMoney(tick.value, yStep, currency, locale),
        plotLeft - 14,
        chartTop + tick.y,
        axisFont,
        colors.muted,
        { align: "right" },
      );
    }
    for (const tick of geometry.xTicks) {
      text(
        displayDay(tick.epochDay, locale, tick.unit),
        plotLeft + tick.x,
        chartTop + plotHeight + 20,
        axisFont,
        colors.muted,
        { align: "center" },
      );
    }
  }

  // Net by Group, with assets against liabilities in a ring beside it.
  const netsTop = bodyTop + layout.trendHeight + IMAGE_BLOCK_GAP;
  sectionTitle(copy.groupNets, right, netsTop);
  const netListTop = netsTop + IMAGE_TITLE_HEIGHT;
  const netTrack =
    NET_LIST_WIDTH - NET_NAME_COLUMN - NET_VALUE_COLUMN - NET_TRACK_GAP * 2;
  const trackLeft = right + NET_NAME_COLUMN + NET_TRACK_GAP;
  const netBars = layoutBars(nets.map((net) => net.valueMinor));
  const netZero = trackLeft + netBars.zero * netTrack;
  nets.forEach((net, index) => {
    const top = netListTop + index * IMAGE_GROUP_NET_ROW_HEIGHT;
    const middle = top + IMAGE_GROUP_NET_ROW_HEIGHT / 2;
    const font = { size: 21, weight: 400 } as const;
    text(net.name, right, middle, font, colors.ink, {
      maxWidth: NET_NAME_COLUMN,
    });
    rect(netZero - 1, top, 2, IMAGE_GROUP_NET_ROW_HEIGHT, colors.faint);
    if (net.valueMinor !== 0) {
      const size = Math.max(netBars.bars[index].size * netTrack, 3);
      rect(
        net.valueMinor > 0 ? netZero + 1 : netZero - 1 - size,
        top + 10,
        size,
        IMAGE_GROUP_NET_ROW_HEIGHT - 20,
        net.valueMinor > 0 ? colors.accent : colors.liability,
        3,
      );
    }
    text(
      money(net.valueMinor),
      right + NET_LIST_WIDTH,
      middle,
      font,
      colors.ink,
      {
        align: "right",
      },
    );
  });
  const split = assetLiabilitySplit(data.balanceSheet);
  if (split.assetsMinor + split.liabilitiesMinor !== 0) {
    const donutLeft = contentRight - DONUT_WIDTH;
    const ringRadius = (DONUT_SIZE - DONUT_RING) / 2;
    const ringCentre = DONUT_SIZE / 2;
    const ring = { width: DONUT_RING };
    const parts =
      split.liabilityShare === 0 || split.assetShare === 0
        ? [
            {
              d: `${arcPath(0, 0.5, ringRadius, ringCentre)} ${arcPath(0.5, 1, ringRadius, ringCentre).replace("M", "L")}`,
              color: split.assetShare > 0 ? colors.accent : colors.liability,
            },
          ]
        : [
            {
              d: arcPath(0, split.assetShare, ringRadius, ringCentre),
              color: colors.accent,
            },
            {
              d: arcPath(split.assetShare, 1, ringRadius, ringCentre),
              color: colors.liability,
            },
          ];
    for (const part of parts) {
      path(part.d, donutLeft + (DONUT_WIDTH - DONUT_SIZE) / 2, netListTop, {
        stroke: { ...ring, color: part.color },
      });
    }
    const keyTop = netListTop + DONUT_SIZE + 20;
    [
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
    ].forEach((part, index) => {
      const top = keyTop + index * 58;
      const font = { size: 20, weight: 400 } as const;
      rect(donutLeft, top + 5, 14, 14, part.color, 3);
      const labelWidth = text(
        part.label,
        donutLeft + 24,
        top + 12,
        font,
        colors.muted,
      );
      text(
        percent.format(part.share),
        donutLeft + 24 + labelWidth + 10,
        top + 12,
        { size: 20, weight: 700 },
        colors.ink,
      );
      text(money(part.minor), donutLeft + 24, top + 36, font, colors.ink);
    });
  }

  // The week's spending and its top payees, in the column the layout picks.
  const { spending } = data;
  const onLeft = layout.spendingColumn === "left";
  const spendingLeft = onLeft ? left : right;
  const spendingWidth = onLeft ? IMAGE_LEFT_WIDTH : IMAGE_RIGHT_WIDTH;
  const spendingTop = onLeft
    ? tableTop + IMAGE_TABLE_ROW_HEIGHT * (rows.length + 1) + IMAGE_BLOCK_GAP
    : netsTop + layout.groupNetsHeight + IMAGE_BLOCK_GAP;
  text(
    money(spending.totalMinor),
    spendingLeft + spendingWidth,
    sectionTitle(copy.spentThisWeek, spendingLeft, spendingTop),
    { size: 26, weight: 700 },
    colors.ink,
    { align: "right", baseline: "alphabetic" },
  );
  text(
    [
      `${change(spending.changeMinor)} ${copy.vsAverage}`,
      `${copy.income} ${money(data.incomeMinor)}`,
    ].join(" · "),
    spendingLeft,
    spendingTop + 70,
    { size: 21, weight: 400 },
    colors.muted,
    { maxWidth: spendingWidth },
  );
  const barsTop = spendingTop + IMAGE_SPENDING_HEAD_HEIGHT;
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
  path(weekBars.partialPaths[0], spendingLeft, barsTop, {
    fill: withOpacity(colors.accent, 0.35),
  });
  path(weekBars.paths[0], spendingLeft, barsTop, { fill: colors.accent });
  const averageDash = { color: colors.ink, width: 2 };
  if (weeks.length >= 2) {
    const averageY = weekBars.y(spending.averageMinor);
    path(
      linePath(0, averageY, WEEK_BARS_WIDTH, averageY),
      spendingLeft,
      barsTop,
      {
        stroke: { ...averageDash, dash: [8, 6] },
      },
    );
  }
  const averageKey = barsTop + WEEK_BARS_HEIGHT + 22;
  path(linePath(0, 0, 24, 0), spendingLeft, averageKey, {
    stroke: { ...averageDash, dash: [6, 4] },
  });
  text(
    `${copy.fourWeekAverage} ${money(spending.averageMinor)}`,
    spendingLeft + 34,
    averageKey,
    { size: 19, weight: 400 },
    colors.muted,
    { maxWidth: WEEK_BARS_WIDTH - 34 },
  );
  const categoriesLeft = spendingLeft + WEEK_BARS_WIDTH + SPENDING_GAP;
  const categoriesWidth = spendingWidth - WEEK_BARS_WIDTH - SPENDING_GAP;
  const categories = spentCategories.slice(0, layout.categories);
  if (categories.length === 0) {
    text(
      copy.noSpending,
      categoriesLeft,
      barsTop + RANKED_TEXT_HEIGHT / 2,
      { size: 21, weight: 400 },
      colors.muted,
      { maxWidth: categoriesWidth },
    );
  } else {
    rankedList(
      categories.map((line) => ({
        label: categoryLineName(line, copy),
        amountMinor: line.amountMinor,
      })),
      categoriesLeft,
      barsTop,
      categoriesWidth,
    );
  }
  if (layout.payees > 0) {
    const payeesTop = spendingTop + layout.spendingHeight + IMAGE_BLOCK_GAP;
    sectionTitle(copy.topPayees, spendingLeft, payeesTop);
    rankedList(
      data.topPayees.slice(0, layout.payees).map((payee) => ({
        label: payee.name,
        amountMinor: payee.amountMinor,
      })),
      spendingLeft,
      payeesTop + IMAGE_TITLE_HEIGHT,
      spendingWidth,
    );
  }

  return { width: REPORT_IMAGE_WIDTH, height: layout.height, commands };
}
