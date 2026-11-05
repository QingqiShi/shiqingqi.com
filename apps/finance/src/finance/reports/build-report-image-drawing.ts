import type { SupportedLocale } from "@tuja/i18n/types";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercentChange } from "../domain/money/format-percent-change.ts";
import {
  drawReportImageGroups,
  shownGroups,
} from "./draw-report-image-groups.ts";
import { drawReportImageSpending } from "./draw-report-image-spending.ts";
import { drawReportImageTrend } from "./draw-report-image-trend.ts";
import { formatReportWeek } from "./format-report-week.ts";
import { formatWeekChange } from "./group-moves.ts";
import {
  colors,
  fonts,
  reportImageCanvas,
  signColor,
  type MeasureText,
  type ReportImageDrawing,
} from "./report-image-canvas.ts";
import {
  IMAGE_CATEGORIES,
  IMAGE_HERO_GAP,
  IMAGE_HERO_HEIGHT,
  IMAGE_PADDING,
  IMAGE_TITLE_LINE_HEIGHT,
  REPORT_IMAGE_WIDTH,
  reportImageLayout,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

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
  const canvas = reportImageCanvas(measureText);
  const { commands, left, contentRight, rect, text, runs, runsWidth } = canvas;
  const currency = data.baseCurrency;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const change = (minor: number) => formatWeekChange(minor, currency, locale);

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
    drawReportImageTrend(canvas, data, { top: layout.trendTop, locale });
  }

  const groupsTop = layout.groupsTop;
  if (groupsTop !== null) {
    drawReportImageGroups(canvas, {
      groups,
      groupsTop,
      groupColumns: layout.groupColumns,
      groupWidth: layout.groupWidth,
      copy,
      money,
      change,
    });
  }

  drawReportImageSpending(canvas, {
    spending: data.spending,
    categories,
    spendingTop: layout.spendingTop,
    locale,
    copy,
    money,
  });

  return { width: REPORT_IMAGE_WIDTH, height: layout.height, commands };
}
