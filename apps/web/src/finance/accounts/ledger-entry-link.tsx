"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { Link } from "#src/links/link.tsx";
import { formatMoney } from "../domain/money/format-money.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { TransactionFace } from "../transactions/transaction-face.tsx";
import { TransactionMetaLine } from "../transactions/transaction-meta-line.tsx";
import type { TransactionRowDescription } from "../transactions/use-describe-transaction.ts";

interface LedgerEntryLinkProps {
  transaction: TransactionRow;
  description: TransactionRowDescription;
  /** In `currency`. */
  amountMinor: number;
  currency: string;
  trailing: ReactNode;
}

export function LedgerEntryLink({
  transaction,
  description,
  amountMinor,
  currency,
  trailing,
}: LedgerEntryLinkProps) {
  const locale = useLocale();
  const isExpected = transaction.status === "expected";
  return (
    <Link
      href={getLocalePath(`/finance/transactions?id=${transaction.id}`, locale)}
      {...stylex.props(
        corner.radius_3,
        transition.colors,
        a11y.focusRingInset,
        styles.link,
      )}
    >
      <TransactionFace
        icon={description.icon}
        title={description.title}
        subtitle={description.subtitle}
        amount={formatMoney(amountMinor, currency, locale, {
          signDisplay: "exceptZero",
        })}
        amountMuted={isExpected}
        trailing={trailing}
      >
        <TransactionMetaLine meta={description.meta} isExpected={isExpected} />
      </TransactionFace>
    </Link>
  );
}

const styles = stylex.create({
  link: {
    display: "block",
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
});
