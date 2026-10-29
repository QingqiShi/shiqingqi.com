"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { transactionsBehind } from "../analytics/transactions-behind.ts";
import { BarChart } from "../charts/bar-chart.tsx";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import { formatReportWeek } from "./format-report-week.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/**
 * The spending of each week up to the Report's, the earlier weeks lighter,
 * against the 4-week average it is compared with. A bar opens the week's
 * spending.
 */
export function ReportSpendingWeeks({ data }: { data: WeeklyReportData }) {
  const locale = useLocale();
  const navigator = useFinanceNavigator();
  const { history, averageMinor } = data.spending;
  if (history.length < 2) return null;
  const currency = data.baseCurrency;
  const last = history.length - 1;
  const weekStart = (index: number) => addDays(history[index].periodEnd, -6);
  const label = t({ en: "Spending by week", zh: "每周支出" });

  return (
    <BarChart
      label={label}
      description={t({
        en: "Spending in each of the last weeks, this week last, with the average of the four weeks before it.",
        zh: "最近各周的支出，最后一根是本周，横线是此前 4 周的平均值。",
      })}
      periodCount={history.length}
      periodLabel={(index) =>
        formatReportWeek(weekStart(index), history[index].periodEnd, locale)
      }
      periodTick={(index) => displayDay(weekStart(index), locale, "day")}
      partialPeriods={history.map((_, index) => (index === last ? 0 : 1))}
      series={[
        {
          key: "spending",
          label,
          values: history.map((week) => week.totalMinor),
          tone: "accent",
        },
      ]}
      formatValue={(minor) => formatMoney(minor, currency, locale)}
      formatTick={(minor, step) =>
        formatAxisMoney(minor, step, currency, locale)
      }
      restReadout={formatReportWeek(
        weekStart(0),
        history[last].periodEnd,
        locale,
      )}
      height={180}
      referenceLine={{
        value: averageMinor,
        label: `${t({ en: "4-week average", zh: "4 周平均" })} ${formatMoney(averageMinor, currency, locale)}`,
      }}
      onActivate={(index) => {
        navigator.push(
          transactionsBehind({
            from: weekStart(index),
            to: history[index].periodEnd,
            kind: "spending",
            member: null,
          }),
        );
      }}
      activateHint={t({
        en: "Press Enter to see the week's spending.",
        zh: "按回车查看该周的支出。",
      })}
    />
  );
}
