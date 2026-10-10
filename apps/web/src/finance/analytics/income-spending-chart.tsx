"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { BarChart } from "../charts/bar-chart.tsx";
import { formatAxisMoney } from "../charts/format-axis-money.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import { formatPeriod } from "./format-period.ts";
import { isMajorPeriod } from "./is-major-period.ts";
import { transactionsHref } from "./transactions-href.ts";
import { usePeriodLabel } from "./use-period-label.ts";

/** Income beside spending for each period, every Category, with the net in the readout. */
export function IncomeSpendingChart({
  state,
  view,
  currency,
}: {
  state: AnalyticsState;
  view: AnalyticsView;
  currency: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const headingId = useId();
  const periodLabel = usePeriodLabel(view);
  const incomeLabel = t({ en: "Income", zh: "收入" });
  const spendingLabel = t({ en: "Spending", zh: "支出" });
  const netLabel = t({ en: "Net", zh: "净额" });
  const money = (minor: number) =>
    formatMoney(Math.round(minor), currency, locale);
  let income = 0;
  let spending = 0;
  for (const value of view.incomeByPeriod) income += value;
  for (const value of view.spendingByPeriod) spending += value;
  const net = income - spending;

  return (
    <section css={stack.item} aria-labelledby={headingId}>
      <Heading level={2} look="h4" id={headingId} css={styles.heading}>
        {t({ en: "Income and spending", zh: "收入与支出" })}
      </Heading>
      <BarChart
        label={t({ en: "Income and spending", zh: "收入与支出" })}
        description={t({
          en: "Income and spending side by side for each period, all categories.",
          zh: "每个时段的收入与支出并排对比，包含全部分类。",
        })}
        layout="grouped"
        periodCount={view.boundaries.length - 1}
        periodLabel={periodLabel}
        partialPeriods={view.partial}
        periodTick={(index) =>
          formatPeriod(view.boundaries, index, view.grouping, locale, "tick")
        }
        periodMajor={(index) =>
          isMajorPeriod(view.boundaries, index, view.grouping)
        }
        series={[
          {
            key: "income",
            label: incomeLabel,
            values: view.incomeByPeriod,
            tone: "series1",
          },
          {
            key: "spending",
            label: spendingLabel,
            values: view.spendingByPeriod,
            tone: "series2",
          },
        ]}
        formatValue={money}
        formatTick={(minor, step) =>
          formatAxisMoney(minor, step, currency, locale)
        }
        restReadout={
          <span css={typeModifier.numeric}>
            {`${netLabel} `}
            <span css={styles.net}>
              {formatMoney(Math.round(net), currency, locale, {
                signDisplay: "exceptZero",
              })}
            </span>
          </span>
        }
        readout={(index) => (
          <span css={typeModifier.numeric}>
            {`${netLabel} `}
            <span css={styles.net}>
              {formatMoney(
                Math.round(
                  view.incomeByPeriod[index] - view.spendingByPeriod[index],
                ),
                currency,
                locale,
                { signDisplay: "exceptZero" },
              )}
            </span>
          </span>
        )}
        onActivate={(index, key) => {
          router.push(
            getLocalePath(
              transactionsHref({
                from: fromEpochDay(view.boundaries[index]),
                to: fromEpochDay(view.boundaries[index + 1] - 1),
                kind:
                  key === "income"
                    ? "income"
                    : key === "spending"
                      ? "spending"
                      : "net",
                member: state.member,
              }),
              locale,
            ),
          );
        }}
        activateHint={t({
          en: "Press Enter to see the transactions.",
          zh: "按回车查看交易。",
        })}
      />
    </section>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
  },
  net: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
});
