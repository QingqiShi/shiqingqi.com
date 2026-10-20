import { gray } from "@tuja/ui/palette/gray.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { red } from "@tuja/ui/palette/red.stylex";
import { range, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { barPath } from "../charts/bar-path.ts";
import { dateTicks } from "../charts/date-ticks.ts";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercentChange } from "../domain/money/format-percent-change.ts";
import { categoryLineName } from "../store/category-display-name.ts";
import { fillTemplate } from "./fill-template.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { formatWeekChange, groupChange } from "./group-moves.ts";
import {
  IMAGE_CATEGORIES,
  IMAGE_CATEGORY_ROW_GAP,
  IMAGE_CATEGORY_ROW_HEIGHT,
  IMAGE_COLUMN_GAP,
  IMAGE_COLUMN_WIDTH,
  IMAGE_CONTENT_WIDTH,
  IMAGE_GROUP_GAP,
  IMAGE_GROUP_HEIGHT,
  IMAGE_GROUP_ROW_GAP,
  IMAGE_PADDING,
  IMAGE_RULE_GAP,
  IMAGE_TITLE_HEIGHT,
  IMAGE_HERO_GAP,
  IMAGE_HERO_HEIGHT,
  IMAGE_TITLE_LINE_HEIGHT,
  IMAGE_TREND_HEIGHT,
  IMAGE_WEEK_BARS_HEIGHT,
  IMAGE_WEEK_BARS_TOP,
  REPORT_IMAGE_WIDTH,
  reportImageLayout,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
import type {
  ReportGroup,
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
      /** An outline under the text, in the background colour, so a line behind it stops short of each letter. */
      halo?: { color: string; width: number };
    };

export interface ReportImageDrawing {
  width: number;
  height: number;
  commands: ReportImageCommand[];
}

interface TextRun {
  text: string;
  font: ReportImageFont;
  color: string;
}

const TREND_LINE_WIDTH = 4;
const TREND_DOT_RADIUS = 8;
/** Room on the right of the trend for its amounts. */
const TREND_AXIS_WIDTH = 96;
/** The date labels under the trend. */
const TREND_AXIS_HEIGHT = 40;
/** A trend whose lowest point is above this share of its highest starts its axis near the lowest point, not at zero. */
const TREND_ZOOM_FLOOR = 0.4;
/** A Group's line is never flatter than this share of its largest amount, so a small change does not look like a big one. */
const GROUP_LINE_MIN_RANGE = 0.08;
/** The top of a Group's line, under its name. */
const GROUP_LINE_TOP = 40;
const GROUP_TEXT_HALO = 10;
const WEEK_BAR_WIDTH = 36;
const WEEK_BAR_RADIUS = 5;
const CATEGORY_BAR_HEIGHT = 8;
const CATEGORY_GAP = 24;

const fonts = {
  heading: { size: 21, weight: 700 },
  hero: { size: 88, weight: 700 },
  stat: { size: 26, weight: 700 },
  statNote: { size: 26, weight: 400 },
  title: { size: 26, weight: 700 },
  amount: { size: 32, weight: 700 },
  groupName: { size: 21, weight: 600 },
  body: { size: 21, weight: 400 },
  caption: { size: 18, weight: 400 },
  captionStrong: { size: 18, weight: 600 },
} satisfies Record<string, ReportImageFont>;

const colors = {
  background: gray._97,
  ink: gray._13,
  muted: gray._30,
  hairline: gray._90,
  axis: gray._80,
  track: gray._92,
  accent: purple._40,
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
  return colors.muted;
}

function linePath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${String(x1)} ${String(y1)} L ${String(x2)} ${String(y2)}`;
}

function circlePath(cx: number, cy: number, r: number) {
  return `M ${String(cx - r)} ${String(cy)} a ${String(r)} ${String(r)} 0 1 0 ${String(r * 2)} 0 a ${String(r)} ${String(r)} 0 1 0 ${String(-r * 2)} 0`;
}

/** The text before and after `{name}` in a translated template. */
function splitTemplate(template: string, name: string) {
  const [before = "", after = ""] = template.split(`{${name}}`);
  return { before, after };
}

/** The line through the points `xs`, `ys`, and the area under it down to `baseline`. */
function lineAndArea(
  xs: readonly number[],
  ys: readonly number[],
  baseline: number,
) {
  const indices = Array.from(xs.keys());
  const x = (index: number) => xs[index];
  const y = (index: number) => ys[index];
  return {
    line: line<number>().x(x).y(y).digits(1)(indices) ?? "",
    area: area<number>().x(x).y0(baseline).y1(y).digits(1)(indices) ?? "",
  };
}

/** A Group with a tile: one with a balance or a change this week. */
function shownGroups(data: WeeklyReportData) {
  const groups = (side: "assets" | "liabilities") =>
    data.balanceSheet[side].groups.map((group) => ({
      group,
      owed: side === "liabilities",
    }));
  return [...groups("assets"), ...groups("liabilities")].filter(
    ({ group }) => group.totalMinor !== 0 || groupChange(group) !== 0,
  );
}

/**
 * The draw commands of a weekly Report's share image, top to bottom: the
 * net worth with its change this week and since 1 January; the whole
 * net-worth trend; a tile per Group with its balance, its change this week
 * and, behind them, its line over the same weeks as the trend; and the
 * week's spending against the weeks before it, by category.
 */
export function buildReportImageDrawing(
  data: WeeklyReportData,
  {
    locale,
    copy,
    measureText,
  }: {
    locale: SupportedLocale;
    copy: ReportImageCopy;
    measureText: MeasureText;
  },
): ReportImageDrawing {
  const commands: ReportImageCommand[] = [];
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const change = (minor: number) => formatWeekChange(minor, currency, locale);

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

  /** Draws `value` and returns its width; `maxWidth` cuts it short with an ellipsis. */
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
      halo,
    }: {
      align?: "left" | "right" | "center";
      baseline?: "alphabetic" | "middle";
      maxWidth?: number;
      halo?: number;
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
      halo:
        halo === undefined
          ? undefined
          : { color: colors.background, width: halo },
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

  /** Draws `parts` one after the other from `x` and returns their width. */
  function runs(
    parts: readonly TextRun[],
    x: number,
    y: number,
    options: { baseline?: "alphabetic" | "middle"; halo?: number } = {},
  ) {
    let width = 0;
    for (const part of parts) {
      width += text(part.text, x + width, y, part.font, part.color, options);
    }
    return width;
  }

  function runsWidth(parts: readonly TextRun[]) {
    return parts.reduce(
      (width, part) => width + measureText(part.text, part.font),
      0,
    );
  }

  /** A rule across the image, then a section title over `top`. */
  function sectionStart(title: string, top: number) {
    rect(
      left,
      top - IMAGE_RULE_GAP - 1.5,
      IMAGE_CONTENT_WIDTH,
      1.5,
      colors.hairline,
    );
    text(title, left, top + 17, fonts.title, colors.ink);
  }

  const left = IMAGE_PADDING;
  const contentRight = IMAGE_PADDING + IMAGE_CONTENT_WIDTH;
  const groups = shownGroups(data);
  const categories = data.spending.byCategory
    .filter((line) => line.amountMinor > 0)
    .slice(0, IMAGE_CATEGORIES);
  const hasTrend = data.trend.length >= 2;
  const layout = reportImageLayout({
    hasTrend,
    groups: groups.length,
    categories: categories.length,
  });

  rect(0, 0, REPORT_IMAGE_WIDTH, layout.height, colors.background);

  runs(
    [
      { text: copy.title, font: fonts.heading, color: colors.ink },
      {
        text: ` · ${formatReportWeek(data.periodStart, data.periodEnd, locale)}`,
        font: fonts.body,
        color: colors.muted,
      },
    ],
    left,
    IMAGE_PADDING + IMAGE_TITLE_LINE_HEIGHT / 2,
  );
  const heroTop = IMAGE_PADDING + IMAGE_TITLE_LINE_HEIGHT + IMAGE_HERO_GAP;
  const heroBottom = heroTop + IMAGE_HERO_HEIGHT;
  text(copy.netWorth, left, heroTop + 12, fonts.caption, colors.muted);
  text(
    money(data.balanceSheet.netWorthMinor),
    left,
    heroBottom - fonts.hero.size / 2,
    fonts.hero,
    colors.ink,
  );
  const { previousWeek, yearStart } = data.comparisons;
  const weekPercent = formatPercentChange(
    previousWeek.changeMinor,
    previousWeek.netWorthMinor,
    locale,
  );
  const stats = [
    {
      label: copy.thisWeek,
      parts: [
        {
          text: change(previousWeek.changeMinor),
          font: fonts.stat,
          color: signColor(previousWeek.changeMinor),
        },
        ...(weekPercent === null
          ? []
          : [
              {
                text: ` (${weekPercent})`,
                font: fonts.statNote,
                color: signColor(previousWeek.changeMinor),
              },
            ]),
      ],
    },
    {
      label: copy.sinceYearStart,
      parts: [
        {
          text: change(yearStart.changeMinor),
          font: fonts.stat,
          color: signColor(yearStart.changeMinor),
        },
      ],
    },
  ];
  const statBottom = heroBottom - 6;
  let statRight = contentRight;
  for (const stat of [...stats].reverse()) {
    const statLeft =
      statRight -
      Math.max(measureText(stat.label, fonts.caption), runsWidth(stat.parts));
    text(stat.label, statLeft, statBottom - 50, fonts.caption, colors.muted);
    runs(stat.parts, statLeft, statBottom - 17);
    statRight = statLeft - 48;
  }

  if (layout.trendTop !== null) {
    const top = layout.trendTop;
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

  /** A Group's line over the weeks of the trend, faint and filling its tile; a liability shows what it owes. */
  function groupLine(
    group: ReportGroup,
    isOwed: boolean,
    tileLeft: number,
    tileTop: number,
  ) {
    if (group.history.length < 2) return;
    const values = group.history.map((total) => (isOwed ? -total : total));
    const low = Math.min(...values);
    const high = Math.max(...values);
    const range = Math.max(
      high - low,
      Math.max(Math.abs(low), Math.abs(high)) * GROUP_LINE_MIN_RANGE,
    );
    if (range === 0) return;
    const middle = (low + high) / 2;
    const y = scaleLinear()
      .domain([middle - range / 2, middle + range / 2])
      .range([IMAGE_GROUP_HEIGHT - 6, GROUP_LINE_TOP]);
    const shape = lineAndArea(
      values.map(
        (_value, index) => (index / (values.length - 1)) * layout.groupWidth,
      ),
      values.map((value) => y(value)),
      IMAGE_GROUP_HEIGHT,
    );
    path(shape.area, tileLeft, tileTop, {
      fill: {
        y0: GROUP_LINE_TOP,
        y1: IMAGE_GROUP_HEIGHT,
        stops: [
          { offset: 0, color: withOpacity(colors.accent, 0.09) },
          { offset: 1, color: withOpacity(colors.accent, 0) },
        ],
      },
    });
    path(shape.line, tileLeft, tileTop, {
      stroke: {
        color: withOpacity(colors.accent, 0.28),
        width: 2.5,
        round: true,
      },
    });
  }

  const groupsTop = layout.groupsTop;
  if (groupsTop !== null) {
    sectionStart(copy.byGroup, groupsTop);
    const owed = splitTemplate(copy.owed, "amount");
    const weekChange = splitTemplate(copy.groupChange, "change");
    groups.forEach(({ group, owed: isOwed }, index) => {
      const column = index % layout.groupColumns;
      const row = Math.floor(index / layout.groupColumns);
      const tileLeft = left + column * (layout.groupWidth + IMAGE_GROUP_GAP);
      const tileTop =
        groupsTop +
        IMAGE_TITLE_HEIGHT +
        row * (IMAGE_GROUP_HEIGHT + IMAGE_GROUP_ROW_GAP);
      groupLine(group, isOwed, tileLeft, tileTop);
      const halo = GROUP_TEXT_HALO;
      text(group.name, tileLeft, tileTop + 14, fonts.groupName, colors.muted, {
        maxWidth: layout.groupWidth,
        halo,
      });
      const amount = {
        text: money(isOwed ? -group.totalMinor : group.totalMinor),
        font: fonts.amount,
        color: colors.ink,
      };
      runs(
        isOwed
          ? [
              { text: owed.before, font: fonts.body, color: colors.muted },
              amount,
              { text: owed.after, font: fonts.body, color: colors.muted },
            ]
          : [amount],
        tileLeft,
        tileTop + 63,
        { baseline: "alphabetic", halo },
      );
      const changeMinor = groupChange(group);
      const value = isOwed
        ? fillTemplate(changeMinor < 0 ? copy.owedMore : copy.owedLess, {
            amount: money(Math.abs(changeMinor)),
          })
        : change(changeMinor);
      runs(
        changeMinor === 0
          ? [{ text: copy.noChange, font: fonts.caption, color: colors.muted }]
          : [
              {
                text: weekChange.before,
                font: fonts.caption,
                color: colors.muted,
              },
              {
                text: value,
                font: fonts.captionStrong,
                color: signColor(changeMinor),
              },
              {
                text: weekChange.after,
                font: fonts.caption,
                color: colors.muted,
              },
            ],
        tileLeft,
        tileTop + 86,
        { halo },
      );
    });
  }

  const { spending } = data;
  const spendingTop = layout.spendingTop;
  sectionStart(copy.spentThisWeek, spendingTop);
  text(
    money(spending.totalMinor),
    left + IMAGE_COLUMN_WIDTH,
    spendingTop + 17,
    fonts.title,
    colors.ink,
    { align: "right" },
  );
  const averageNote =
    spending.changeMinor === 0
      ? copy.atAverage
      : fillTemplate(
          spending.changeMinor > 0 ? copy.aboveAverage : copy.belowAverage,
          { amount: money(Math.abs(spending.changeMinor)) },
        );
  text(averageNote, left, spendingTop + 52, fonts.body, colors.muted, {
    maxWidth: IMAGE_COLUMN_WIDTH,
  });
  const weeks = spending.history;
  const barsTop = spendingTop + IMAGE_WEEK_BARS_TOP;
  if (weeks.length > 0) {
    const largest = Math.max(
      ...weeks.map((week) => week.totalMinor),
      spending.averageMinor,
      1,
    );
    const barY = (minor: number) =>
      IMAGE_WEEK_BARS_HEIGHT -
      (Math.max(minor, 0) / largest) * IMAGE_WEEK_BARS_HEIGHT;
    const slot = IMAGE_COLUMN_WIDTH / weeks.length;
    const barWidth = Math.min(WEEK_BAR_WIDTH, slot * 0.68);
    weeks.forEach((week, index) => {
      const d = barPath(
        index * slot + (slot - barWidth) / 2,
        IMAGE_WEEK_BARS_HEIGHT,
        barY(week.totalMinor),
        barWidth,
        WEEK_BAR_RADIUS,
      );
      if (d === "") return;
      path(d, left, barsTop, {
        fill:
          index === weeks.length - 1
            ? colors.accent
            : withOpacity(colors.accent, 0.3),
      });
    });
    path(
      linePath(
        0,
        IMAGE_WEEK_BARS_HEIGHT,
        IMAGE_COLUMN_WIDTH,
        IMAGE_WEEK_BARS_HEIGHT,
      ),
      left,
      barsTop,
      { stroke: { color: colors.axis, width: 1.5 } },
    );
    const averageY = barY(spending.averageMinor);
    path(linePath(0, averageY, IMAGE_COLUMN_WIDTH, averageY), left, barsTop, {
      stroke: { color: colors.ink, width: 2 },
    });
    const labelMiddle = barsTop + IMAGE_WEEK_BARS_HEIGHT + 22;
    text(
      displayDay(addDays(weeks[0].periodEnd, -6), locale, "day"),
      left,
      labelMiddle,
      fonts.caption,
      colors.muted,
    );
    text(
      copy.thisWeek,
      left + IMAGE_COLUMN_WIDTH,
      labelMiddle,
      fonts.caption,
      colors.muted,
      { align: "right" },
    );
    const key = `${copy.fourWeekAverage} ${money(spending.averageMinor)}`;
    const keyWidth = 26 + 8 + measureText(key, fonts.caption);
    const keyLeft = left + (IMAGE_COLUMN_WIDTH - keyWidth) / 2;
    path(linePath(0, 0, 26, 0), keyLeft, labelMiddle, {
      stroke: { color: colors.ink, width: 2 },
    });
    text(key, keyLeft + 34, labelMiddle, fonts.caption, colors.muted);
  }

  const categoriesLeft = left + IMAGE_COLUMN_WIDTH + IMAGE_COLUMN_GAP;
  text(
    copy.byCategory,
    categoriesLeft,
    spendingTop + 17,
    fonts.title,
    colors.ink,
  );
  const listTop = spendingTop + IMAGE_TITLE_HEIGHT;
  if (categories.length === 0) {
    text(
      copy.noSpending,
      categoriesLeft,
      listTop + IMAGE_CATEGORY_ROW_HEIGHT / 2,
      fonts.body,
      colors.muted,
    );
  } else {
    const lines = categories.map((category) => ({
      name: categoryLineName(category, copy),
      amount: money(category.amountMinor),
      amountMinor: category.amountMinor,
    }));
    const nameWidth = Math.min(
      Math.max(...lines.map((entry) => measureText(entry.name, fonts.body))),
      IMAGE_COLUMN_WIDTH * 0.35,
    );
    const amountWidth = Math.max(
      ...lines.map((entry) => measureText(entry.amount, fonts.body)),
    );
    const trackLeft = categoriesLeft + nameWidth + CATEGORY_GAP;
    const trackWidth =
      IMAGE_COLUMN_WIDTH - nameWidth - amountWidth - CATEGORY_GAP * 2;
    const largest = lines[0].amountMinor;
    lines.forEach((entry, index) => {
      const middle =
        listTop +
        index * (IMAGE_CATEGORY_ROW_HEIGHT + IMAGE_CATEGORY_ROW_GAP) +
        IMAGE_CATEGORY_ROW_HEIGHT / 2;
      text(entry.name, categoriesLeft, middle, fonts.body, colors.ink, {
        maxWidth: nameWidth,
      });
      const barTop = middle - CATEGORY_BAR_HEIGHT / 2;
      const radius = CATEGORY_BAR_HEIGHT / 2;
      rect(
        trackLeft,
        barTop,
        trackWidth,
        CATEGORY_BAR_HEIGHT,
        colors.track,
        radius,
      );
      rect(
        trackLeft,
        barTop,
        Math.max(
          (entry.amountMinor / largest) * trackWidth,
          CATEGORY_BAR_HEIGHT,
        ),
        CATEGORY_BAR_HEIGHT,
        colors.accent,
        radius,
      );
      text(entry.amount, contentRight, middle, fonts.body, colors.ink, {
        align: "right",
      });
    });
  }

  return { width: REPORT_IMAGE_WIDTH, height: layout.height, commands };
}
