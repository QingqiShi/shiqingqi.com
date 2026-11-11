"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { formatMoney } from "../domain/money/format-money.ts";

/** What a day spent and received, for the end of its DayHeader. */
export function DayTotals({
  expenseMinor,
  incomeMinor,
  currency,
  locale,
}: {
  expenseMinor: number;
  incomeMinor: number;
  currency: string;
  locale: string;
}) {
  const spentLabel = t({ en: "spent", zh: "支出" });
  const receivedLabel = t({ en: "received", zh: "收入" });
  return (
    <Text
      as="span"
      look="caption"
      tone="muted"
      numeric
      css={[flex.row, styles.totals]}
    >
      {expenseMinor !== 0 ? (
        <span>
          <span css={a11y.srOnly}>{`${spentLabel} `}</span>
          {formatMoney(expenseMinor, currency, locale, {
            signDisplay: "exceptZero",
          })}
        </span>
      ) : null}
      {incomeMinor !== 0 ? (
        <span>
          <span css={a11y.srOnly}>{`${receivedLabel} `}</span>
          {formatMoney(incomeMinor, currency, locale, {
            signDisplay: "exceptZero",
          })}
        </span>
      ) : null}
    </Text>
  );
}

const styles = stylex.create({
  totals: {
    gap: rhythm.item,
  },
});
