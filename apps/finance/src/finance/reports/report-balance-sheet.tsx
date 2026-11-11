"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableFoot } from "@tuja/ui/components/table-foot";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { accountDetailLine } from "../accounts/account-detail-line.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { formatWeekChange, groupChange, sideChange } from "./group-moves.ts";
import { ReportSection } from "./report-section.tsx";
import type {
  ReportSide,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/**
 * Every Account at the end of the week,
 * under its Group and its side, with the subtotals, net worth, and how much
 * each line changed over the week: the same shape as the hand-made sheet.
 */
export function ReportBalanceSheet({
  data,
  headingLevel,
}: {
  data: WeeklyReportData;
  headingLevel: 2 | 3;
}) {
  const locale = useLocale();
  const accountName = useAccountDisplayName();
  const currency = data.baseCurrency;
  const money = (minor: number, inCurrency = currency) =>
    formatMoney(minor, inCurrency, locale);
  const sides: { key: string; label: string; side: ReportSide }[] = [
    {
      key: "assets",
      label: t({ en: "Assets", zh: "资产" }),
      side: data.balanceSheet.assets,
    },
    {
      key: "liabilities",
      label: t({ en: "Liabilities", zh: "负债" }),
      side: data.balanceSheet.liabilities,
    },
  ];
  const title = t({ en: "Balance sheet", zh: "资产负债表" });
  const changeCell = (changeMinor: number, strong = false) => (
    <TableCell
      numeric
      tone={!strong || changeMinor === 0 ? "muted" : undefined}
      css={styles.wideOnly}
    >
      {formatWeekChange(changeMinor, currency, locale)}
    </TableCell>
  );

  return (
    <ReportSection title={title} headingLevel={headingLevel}>
      <Table caption={title}>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">
              {t({ en: "Account", zh: "账户" })}
            </TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              {t({ en: "Balance", zh: "余额" })}
            </TableHeaderCell>
            <TableHeaderCell scope="col" numeric css={styles.wideOnly}>
              {t({ en: "This week", zh: "本周变化" })}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        {sides.map(({ key, label, side }) => (
          <TableBody key={key}>
            <TableRow look="total">
              <TableHeaderCell scope="row">{label}</TableHeaderCell>
              <TableCell numeric>{money(side.totalMinor)}</TableCell>
              {changeCell(sideChange(side), true)}
            </TableRow>
            {side.groups.flatMap((group) => [
              <TableRow key={group.id} look="subtotal">
                <TableHeaderCell scope="row" indent={1}>
                  <span css={typeModifier.verbatim}>{group.name}</span>
                </TableHeaderCell>
                <TableCell numeric>{money(group.totalMinor)}</TableCell>
                {changeCell(groupChange(group), true)}
              </TableRow>,
              ...group.accounts.map((account) => {
                const detail = accountDetailLine(account, account.ownerName);
                return (
                  <TableRow key={account.id}>
                    <TableHeaderCell scope="row" indent={2}>
                      <span css={[typeModifier.verbatim, styles.block]}>
                        {accountName(account)}
                      </span>
                      {detail === "" ? null : (
                        <Text
                          as="span"
                          look="caption"
                          tone="muted"
                          css={styles.block}
                        >
                          {detail}
                        </Text>
                      )}
                    </TableHeaderCell>
                    <TableCell numeric>
                      <span css={styles.block}>{money(account.baseMinor)}</span>
                      {account.currency === currency ? null : (
                        <Text
                          as="span"
                          look="caption"
                          tone="muted"
                          css={styles.block}
                        >
                          {money(account.balanceMinor, account.currency)}
                        </Text>
                      )}
                    </TableCell>
                    {changeCell(account.baseMinor - account.previousBaseMinor)}
                  </TableRow>
                );
              }),
            ])}
          </TableBody>
        ))}
        <TableFoot>
          <TableRow look="total">
            <TableHeaderCell scope="row">
              {t({ en: "Net worth", zh: "净资产" })}
            </TableHeaderCell>
            <TableCell numeric>
              {money(data.balanceSheet.netWorthMinor)}
            </TableCell>
            {changeCell(data.comparisons.previousWeek.changeMinor, true)}
          </TableRow>
        </TableFoot>
      </Table>
    </ReportSection>
  );
}

const styles = stylex.create({
  block: {
    display: "block",
  },
  wideOnly: {
    display: { default: "none", [breakpoints.md]: "table-cell" },
  },
});
