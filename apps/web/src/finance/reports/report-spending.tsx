"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { RankedRow } from "../analytics/ranked-row.tsx";
import { ChartLegend } from "../charts/chart-legend.tsx";
import { chartMarks } from "../charts/chart-marks.stylex.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { financeHref } from "../navigation/finance-href.ts";
import type { TransactionFilters } from "../transactions/transaction-filters.ts";
import { fillTemplate } from "./fill-template.ts";
import { reportColumns } from "./report-columns.stylex.ts";
import { ReportRankedList } from "./report-ranked-list.tsx";
import { ReportSection } from "./report-section.tsx";
import { ReportSpendingWeeks } from "./report-spending-weeks.tsx";
import { useCategoryLineName } from "./use-category-line-name.ts";
import type {
  SpendingLine,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/**
 * The week's spending: the total against the four weeks before, the last
 * weeks side by side, by Category and by Member against their own
 * averages, the top Payees, and what still needs Review. Each name opens
 * the Transactions behind it.
 */
export function ReportSpending({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  const currency = data.baseCurrency;
  const { spending } = data;
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const count = new Intl.NumberFormat(locale);
  const listLevel = headingLevel === 2 ? 3 : 4;
  const transactionsHref = (filters: Partial<TransactionFilters>) =>
    financeHref(
      {
        screen: "transactions",
        filters: { ...filters, from: data.periodStart, to: data.periodEnd },
      },
      locale,
    );
  const categoryName = useCategoryLineName();
  const vsAverage = t({ en: "vs avg", zh: "较均值" });

  const lineRows = (
    param: "category" | "member",
    lines: readonly SpendingLine[],
    fallback: string,
  ) => {
    const largest = Math.max(
      ...lines.map((line) => Math.max(line.amountMinor, line.averageMinor)),
      1,
    );
    return lines.map((line) => (
      <RankedRow
        key={line.id ?? ""}
        label={
          line.id === null
            ? fallback
            : param === "category"
              ? categoryName(line)
              : line.name
        }
        href={
          line.id === null
            ? undefined
            : transactionsHref(
                param === "category"
                  ? { categoryIds: [line.id] }
                  : { memberIds: [line.id] },
              )
        }
        value={money(line.amountMinor)}
        magnitude={line.amountMinor / largest}
        mark={line.averageMinor / largest}
        detail={
          <>
            <MoneyChange changeMinor={line.changeMinor} currency={currency} />{" "}
            {vsAverage}
          </>
        }
      />
    ));
  };
  const legend = (
    <ChartLegend
      items={[
        {
          label: t({ en: "This week", zh: "本周" }),
          keyStyle: chartMarks.neutralKey,
          shape: "square",
        },
        {
          label: t({ en: "4-week average", zh: "4 周平均" }),
          keyStyle: chartMarks.referenceKey,
          shape: "tick",
        },
      ]}
    />
  );
  const largestPayee = Math.max(
    ...data.topPayees.map((payee) => payee.amountMinor),
    1,
  );

  const transactionCount = fillTemplate(
    t({ en: "{count} transactions", zh: "{count} 笔交易" }),
    { count: count.format(data.transactionCount) },
  );
  const reviewCount = fillTemplate(
    t({ en: "{count} still to review", zh: "{count} 笔待审核" }),
    { count: count.format(data.reviewCount) },
  );
  const onePayment = t({ en: "{count} payment", zh: "{count} 笔" });
  const payments = t({ en: "{count} payments", zh: "{count} 笔" });
  const payeeCount = (value: number) =>
    fillTemplate(value === 1 ? onePayment : payments, {
      count: count.format(value),
    });
  const showMembers =
    spending.byMember.length > 1 ||
    spending.byMember.some((line) => line.id === null);

  return (
    <ReportSection
      title={t({ en: "Spending this week", zh: "本周支出" })}
      headingLevel={headingLevel}
    >
      <div css={[reportColumns.base, styles.top]}>
        <div css={stack.item}>
          <div css={stack.text}>
            <span css={[typeRole.h3, typeModifier.numeric]}>
              {money(spending.totalMinor)}
            </span>
            <p css={[cluster.tight, typeRole.bodySmall, styles.line]}>
              <MoneyChange
                changeMinor={spending.changeMinor}
                currency={currency}
              />
              <span css={styles.muted}>
                {fillTemplate(
                  t({
                    en: "vs the 4-week average of {amount}",
                    zh: "较 4 周平均 {amount}",
                  }),
                  { amount: money(spending.averageMinor) },
                )}
              </span>
            </p>
          </div>
          <div css={[cluster.item, styles.facts]}>
            <p
              css={[
                cluster.tight,
                typeRole.bodySmall,
                styles.line,
                styles.muted,
              ]}
            >
              <span>
                {t({ en: "Income", zh: "收入" })}{" "}
                <span css={[typeModifier.numeric, styles.fact]}>
                  {money(data.incomeMinor)}
                </span>
              </span>
              <span aria-hidden>·</span>
              <span>{transactionCount}</span>
            </p>
            {data.reviewCount > 0 ? (
              <AnchorButton
                href={transactionsHref({ review: true })}
                linkComponent={Link}
                size="sm"
                icon={<ArrowRightIcon weight="bold" />}
              >
                {reviewCount}
              </AnchorButton>
            ) : null}
          </div>
        </div>
        <ReportSpendingWeeks data={data} />
      </div>
      {spending.byCategory.length > 0 ? (
        <div css={styles.lists}>
          <ReportRankedList
            title={t({ en: "By category", zh: "按分类" })}
            headingLevel={listLevel}
            aside={legend}
          >
            {lineRows(
              "category",
              spending.byCategory,
              t({ en: "Uncategorised", zh: "未分类" }),
            )}
          </ReportRankedList>
          <div css={stack.group}>
            {showMembers ? (
              <ReportRankedList
                title={t({ en: "By member", zh: "按成员" })}
                headingLevel={listLevel}
                aside={legend}
              >
                {lineRows(
                  "member",
                  spending.byMember,
                  t({ en: "Shared", zh: "共同" }),
                )}
              </ReportRankedList>
            ) : null}
            {data.topPayees.length > 0 ? (
              <ReportRankedList
                title={t({ en: "Top payees", zh: "主要商家" })}
                headingLevel={listLevel}
              >
                {data.topPayees.map((payee) => (
                  <RankedRow
                    key={payee.id}
                    label={payee.name}
                    href={transactionsHref({ payeeIds: [payee.id] })}
                    value={money(payee.amountMinor)}
                    magnitude={payee.amountMinor / largestPayee}
                    detail={payeeCount(payee.count)}
                  />
                ))}
              </ReportRankedList>
            ) : null}
          </div>
        </div>
      ) : (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Nothing spent this week or the four before.",
            zh: "本周及之前四周都没有支出。",
          })}
        </Text>
      )}
    </ReportSection>
  );
}

const styles = stylex.create({
  line: {
    margin: 0,
  },
  muted: {
    color: color.fgMuted,
  },
  fact: {
    color: color.fg,
  },
  facts: {
    justifyContent: "space-between",
    alignItems: "center",
    rowGap: rhythm.tight,
  },
  top: {
    gap: rhythm.group,
  },
  lists: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
    alignItems: "start",
    columnGap: rhythm.section,
    rowGap: rhythm.group,
  },
});
