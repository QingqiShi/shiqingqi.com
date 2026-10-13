"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";

interface LedgerEntryLinkProps {
  transaction: TransactionRow;
  /** From `useTransactionTitle`. */
  title: string;
  day: string;
  /** The Entry's amount, in `currency`. */
  amountMinor: number;
  currency: string;
  /** The account's balance after the Entry, under its amount. */
  balanceAfter?: number | null;
}

/** One Entry of a Ledger, opening its Transaction in the editor. */
export function LedgerEntryLink({
  transaction,
  title,
  day,
  amountMinor,
  currency,
  balanceAfter = null,
}: LedgerEntryLinkProps) {
  const locale = useLocale();
  const expectedLabel = t({ en: "Expected", zh: "待确认" });
  const afterLabel = t({ en: "Balance after:", zh: "变动后余额：" });

  return (
    <Link
      href={getLocalePath(`/finance/transactions?id=${transaction.id}`, locale)}
      {...stylex.props(
        row.tight,
        corner.radius_2,
        transition.colors,
        a11y.focusRing,
        styles.item,
      )}
    >
      <span css={[typeRole.caption, typeModifier.numeric, styles.day]}>
        {displayDay(day, locale, "day")}
      </span>
      <span css={[typeRole.bodySmall, styles.title]}>{title}</span>
      {transaction.status === "expected" ? (
        <Badge size="sm" intent="info">
          {expectedLabel}
        </Badge>
      ) : null}
      <span css={styles.amounts}>
        <span css={[typeRole.bodySmall, typeModifier.numeric, styles.amount]}>
          {formatMoney(amountMinor, currency, locale, {
            signDisplay: "exceptZero",
          })}
        </span>
        {balanceAfter === null ? null : (
          <span css={[typeRole.caption, typeModifier.numeric, styles.after]}>
            <span css={a11y.srOnly}>{afterLabel} </span>
            {formatMoney(balanceAfter, currency, locale)}
          </span>
        )}
      </span>
    </Link>
  );
}

const styles = stylex.create({
  item: {
    minBlockSize: space._7,
    paddingInline: space._1,
    gap: rhythm.tight,
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  day: {
    flexShrink: 0,
    minInlineSize: "4.5em",
    whiteSpace: "nowrap",
    color: color.fgMuted,
  },
  title: {
    flexGrow: 1,
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  amount: {
    flexShrink: 0,
    fontWeight: font.weight_5,
  },
  amounts: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  after: {
    color: color.fgMuted,
  },
});
