"use client";

import { useLocale } from "@tuja/i18n/use-locale";
import { ListRow } from "@tuja/ui/components/list-row";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import type { ReactNode } from "react";
import { formatMoney } from "../domain/money/format-money.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import {
  hasMetaLine,
  TransactionMetaLine,
} from "../transactions/transaction-meta-line.tsx";
import type { TransactionRowDescription } from "../transactions/use-describe-transaction.ts";

interface LedgerEntryLinkProps {
  transaction: TransactionRow;
  description: TransactionRowDescription;
  /** In `currency`. */
  amountMinor: number;
  currency: string;
  /** Under the amount, such as the balance after the Entry. */
  trailing: ReactNode;
  /** Opens the Transaction in the column after the Ledger. */
  href: string;
  /** Whether the Transaction is open in that column now. */
  isSelected: boolean;
  /** Buttons beside the row, outside the link. */
  actions?: ReactNode;
}

/** One Entry of a Ledger, a row of a list. It opens its Transaction in the column after the Ledger. */
export function LedgerEntryLink({
  transaction,
  description,
  amountMinor,
  currency,
  trailing,
  href,
  isSelected,
  actions,
}: LedgerEntryLinkProps) {
  const locale = useLocale();
  const isExpected = transaction.status === "expected";
  const amount = formatMoney(amountMinor, currency, locale, {
    signDisplay: "exceptZero",
  });
  return (
    <ListRow
      href={href}
      linkComponent={SplitViewLink}
      aria-current={isSelected ? "true" : undefined}
      caret={false}
      leading={description.icon}
      leadingShape="circle"
      detail={description.subtitle}
      extra={
        hasMetaLine({ meta: description.meta, isExpected }) ? (
          <TransactionMetaLine
            meta={description.meta}
            isExpected={isExpected}
          />
        ) : null
      }
      value={
        isExpected ? (
          <Text as="span" weight="medium" tone="muted">
            {amount}
          </Text>
        ) : (
          amount
        )
      }
      valueDetail={trailing}
      actions={actions}
    >
      {description.title}
    </ListRow>
  );
}
