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
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
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
      css={[
        styles.wideOnly,
        strong ? styles.strongChange : styles.muted,
        changeMinor === 0 && styles.muted,
      ]}
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
            <TableRow css={styles.sideRow}>
              <TableHeaderCell scope="row" css={styles.sideLabel}>
                {label}
              </TableHeaderCell>
              <TableCell numeric css={styles.sideTotal}>
                {money(side.totalMinor)}
              </TableCell>
              {changeCell(sideChange(side), true)}
            </TableRow>
            {side.groups.flatMap((group) => [
              <TableRow key={group.id} css={styles.groupRow}>
                <TableHeaderCell scope="row" css={styles.groupLabel}>
                  {group.name}
                </TableHeaderCell>
                <TableCell numeric css={styles.groupTotal}>
                  {money(group.totalMinor)}
                </TableCell>
                {changeCell(groupChange(group), true)}
              </TableRow>,
              ...group.accounts.map((account) => {
                const detail = accountDetailLine(account, account.ownerName);
                return (
                  <TableRow key={account.id}>
                    <TableHeaderCell scope="row" css={styles.accountLabel}>
                      <span css={styles.block}>{accountName(account)}</span>
                      {detail === "" ? null : (
                        <span
                          css={[typeRole.caption, styles.block, styles.muted]}
                        >
                          {detail}
                        </span>
                      )}
                    </TableHeaderCell>
                    <TableCell numeric>
                      <span css={styles.block}>{money(account.baseMinor)}</span>
                      {account.currency === currency ? null : (
                        <span
                          css={[typeRole.caption, styles.block, styles.muted]}
                        >
                          {money(account.balanceMinor, account.currency)}
                        </span>
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
          <TableRow css={styles.netRow}>
            <TableHeaderCell scope="row" css={styles.sideLabel}>
              {t({ en: "Net worth", zh: "净资产" })}
            </TableHeaderCell>
            <TableCell numeric css={styles.sideTotal}>
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
  sideRow: {
    backgroundColor: color.bgSurfaceSunken,
  },
  sideLabel: {
    fontWeight: font.weight_7,
  },
  sideTotal: {
    fontWeight: font.weight_7,
  },
  groupRow: {
    backgroundColor: color.bgSurface,
  },
  groupLabel: {
    paddingInlineStart: space._5,
    fontWeight: font.weight_6,
  },
  groupTotal: {
    fontWeight: font.weight_6,
  },
  accountLabel: {
    paddingInlineStart: space._7,
    fontWeight: font.weight_4,
  },
  netRow: {
    borderBlockStartWidth: "2px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.fg,
  },
  block: {
    display: "block",
  },
  muted: {
    color: color.fgMuted,
  },
  strongChange: {
    fontWeight: font.weight_6,
  },
  wideOnly: {
    display: { default: "none", [breakpoints.md]: "table-cell" },
  },
});
