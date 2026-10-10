"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { fillTemplate } from "./fill-template.ts";
import { ReportChange } from "./report-change.tsx";
import { ReportSection } from "./report-section.tsx";
import { useCategoryLineName } from "./use-category-line-name.ts";
import type {
  SpendingLine,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

type FilterParam = "category" | "member" | "payee";

/**
 * The week's spending: the total against the four weeks before, by
 * Category and by Member, the top Payees, and what still needs Review.
 * Each name opens the Transactions behind it.
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
  const transactionsHref = (params: Record<string, string>) =>
    getLocalePath(
      `/finance/transactions?${new URLSearchParams({
        ...params,
        from: data.periodStart,
        to: data.periodEnd,
      }).toString()}`,
      locale,
    );
  const linkStyle = stylex.props(a11y.focusRing, styles.link);
  const categoryName = useCategoryLineName();
  const nameCell = (
    param: FilterParam,
    line: SpendingLine,
    fallback: string,
  ) => {
    const name = param === "category" ? categoryName(line) : line.name;
    return line.id === null ? (
      fallback
    ) : (
      <Link href={transactionsHref({ [param]: line.id })} {...linkStyle}>
        {name}
      </Link>
    );
  };

  const columns = {
    spent: t({ en: "Spent", zh: "支出" }),
    average: t({ en: "4-week average", zh: "4 周平均" }),
    change: t({ en: "Change", zh: "变化" }),
  };
  const lineTable = (
    caption: string,
    nameColumn: string,
    param: FilterParam,
    lines: readonly SpendingLine[],
    fallback: string,
  ) => (
    <Table caption={caption} captionVisible>
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">{nameColumn}</TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {columns.spent}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric css={styles.wideOnly}>
            {columns.average}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {columns.change}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id ?? ""}>
            <TableHeaderCell scope="row" css={styles.nameCell}>
              {nameCell(param, line, fallback)}
            </TableHeaderCell>
            <TableCell numeric>{money(line.amountMinor)}</TableCell>
            <TableCell numeric css={[styles.wideOnly, styles.muted]}>
              {money(line.averageMinor)}
            </TableCell>
            <TableCell numeric>
              <ReportChange
                changeMinor={line.changeMinor}
                currency={currency}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const uncategorised = t({ en: "Uncategorised", zh: "未分类" });
  const noMember = t({ en: "Shared", zh: "共同" });
  const transactionCount = fillTemplate(
    t({ en: "{count} transactions", zh: "{count} 笔交易" }),
    { count: count.format(data.transactionCount) },
  );
  const reviewCount = fillTemplate(
    t({ en: "{count} still to review", zh: "{count} 笔待审核" }),
    { count: count.format(data.reviewCount) },
  );

  return (
    <ReportSection
      title={t({ en: "Spending this week", zh: "本周支出" })}
      headingLevel={headingLevel}
    >
      <div css={stack.tight}>
        <span css={[typeRole.h3, typeModifier.numeric]}>
          {money(spending.totalMinor)}
        </span>
        <p css={[cluster.tight, typeRole.bodySmall, styles.line]}>
          <ReportChange
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
        <p css={[cluster.tight, typeRole.bodySmall, styles.line, styles.muted]}>
          <span>
            {t({ en: "Income", zh: "收入" })}{" "}
            <span css={typeModifier.numeric}>{money(data.incomeMinor)}</span>
          </span>
          <span aria-hidden>·</span>
          <span>{transactionCount}</span>
        </p>
      </div>
      {data.reviewCount > 0 ? (
        <div>
          <AnchorButton
            href={transactionsHref({ review: "1" })}
            linkComponent={Link}
            size="sm"
            icon={<ArrowRightIcon weight="bold" />}
          >
            {reviewCount}
          </AnchorButton>
        </div>
      ) : null}
      {spending.byCategory.length > 0 ? (
        lineTable(
          t({ en: "By category", zh: "按分类" }),
          t({ en: "Category", zh: "分类" }),
          "category",
          spending.byCategory,
          uncategorised,
        )
      ) : (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Nothing spent this week or the four before.",
            zh: "本周及之前四周都没有支出。",
          })}
        </Text>
      )}
      {spending.byMember.length > 1 ||
      spending.byMember.some((line) => line.id === null)
        ? lineTable(
            t({ en: "By member", zh: "按成员" }),
            t({ en: "Member", zh: "成员" }),
            "member",
            spending.byMember,
            noMember,
          )
        : null}
      {data.topPayees.length > 0 ? (
        <Table caption={t({ en: "Top payees", zh: "主要商家" })} captionVisible>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">
                {t({ en: "Payee", zh: "商家" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Transactions", zh: "笔数" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {columns.spent}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.topPayees.map((payee) => (
              <TableRow key={payee.id}>
                <TableHeaderCell scope="row" css={styles.nameCell}>
                  <Link
                    href={transactionsHref({ payee: payee.id })}
                    {...linkStyle}
                  >
                    {payee.name}
                  </Link>
                </TableHeaderCell>
                <TableCell numeric css={styles.muted}>
                  {count.format(payee.count)}
                </TableCell>
                <TableCell numeric>{money(payee.amountMinor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
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
  nameCell: {
    fontWeight: font.weight_4,
  },
  link: {
    color: color.fg,
    textDecorationColor: color.border,
    textUnderlineOffset: "0.2em",
  },
  wideOnly: {
    display: { default: "none", [breakpoints.md]: "table-cell" },
  },
});
