"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "@tuja/i18n/use-locale";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
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
  /** Opens the Transaction in the column after the Ledger. */
  href: string;
  /** Whether the Transaction is open in that column now. */
  isSelected: boolean;
}

/** One Entry of a Ledger. It opens its Transaction in the column after the Ledger. */
export function LedgerEntryLink({
  transaction,
  description,
  amountMinor,
  currency,
  trailing,
  href,
  isSelected,
}: LedgerEntryLinkProps) {
  const locale = useLocale();
  const isExpected = transaction.status === "expected";
  return (
    <SplitViewLink
      href={href}
      aria-current={isSelected ? "true" : undefined}
      {...stylex.props(
        corner.radius_3,
        transition.colors,
        selected.quiet,
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
    </SplitViewLink>
  );
}

const styles = stylex.create({
  link: {
    display: "block",
    color: color.fg,
    textDecoration: "none",
  },
});
