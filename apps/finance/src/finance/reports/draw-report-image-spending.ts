import type { SupportedLocale } from "@tuja/i18n/types";
import { barPath } from "../charts/bar-path.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { categoryLineName } from "../store/category-display-name.ts";
import { fillTemplate } from "./fill-template.ts";
import {
  colors,
  fonts,
  linePath,
  withOpacity,
  type ReportImageCanvas,
} from "./report-image-canvas.ts";
import {
  IMAGE_CATEGORY_ROW_GAP,
  IMAGE_CATEGORY_ROW_HEIGHT,
  IMAGE_COLUMN_GAP,
  IMAGE_COLUMN_WIDTH,
  IMAGE_TITLE_HEIGHT,
  IMAGE_WEEK_BARS_HEIGHT,
  IMAGE_WEEK_BARS_TOP,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

const WEEK_BAR_WIDTH = 36;
const WEEK_BAR_RADIUS = 5;
const CATEGORY_BAR_HEIGHT = 8;
const CATEGORY_GAP = 24;

export function drawReportImageSpending(
  {
    measureText,
    left,
    contentRight,
    rect,
    path,
    text,
    sectionStart,
  }: ReportImageCanvas,
  {
    spending,
    categories,
    spendingTop,
    locale,
    copy,
    money,
  }: {
    spending: WeeklyReportData["spending"];
    categories: WeeklyReportData["spending"]["byCategory"];
    spendingTop: number;
    locale: SupportedLocale;
    copy: ReportImageCopy;
    money: (minor: number) => string;
  },
) {
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
}
