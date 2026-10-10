"use client";

import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { TimeSeriesChart } from "../charts/time-series-chart.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { selectAccountChart } from "./select-account-chart.ts";
import { useStoredRange } from "./use-stored-range.ts";

interface AccountChartProps {
  account: AccountRow;
  today: string;
}

/** One account's balance over the picked range, in its own currency. */
export function AccountChart({ account, today }: AccountChartProps) {
  const locale = useLocale();
  const [range, setRange] = useStoredRange("finance:account-range", "1Y");
  const series = useReplica((snapshot) =>
    selectAccountChart(snapshot, account.id, range, today),
  );
  const start = series.days.length > 0 ? series.days[0] : today;
  return (
    <section
      css={stack.item}
      aria-label={t({ en: "Balance history", zh: "余额走势" })}
    >
      <TimeSeriesChart
        series={series}
        label={`${account.name} · ${t({ en: "Balance", zh: "余额" })}`}
        description={t({
          en: "The account's balance at the end of each day in the range.",
          zh: "所选时间范围内该账户每天结束时的余额。",
        })}
        formatValue={(minor) => formatMoney(minor, account.currency, locale)}
        formatTick={(minor, step) =>
          formatAxisMoney(minor, step, account.currency, locale)
        }
        restReadout={`${displayDay(start, locale, "dayYear")} – ${displayDay(today, locale, "dayYear")}`}
        height={180}
      />
      <ChartRangeChips value={range} onChange={setRange} />
    </section>
  );
}
