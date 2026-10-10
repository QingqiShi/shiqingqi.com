"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { BankLinkRow } from "../sync/row-schemas.ts";
import { useResolveBankBalance } from "./use-resolve-bank-balance.ts";

interface BankBalanceNoticeProps {
  link: BankLinkRow;
  accountName: string;
  /** The account's name as a heading, for a list of several accounts. */
  showName?: boolean;
}

/** "Bank says £X · we say £Y" with "Use bank balance" and "Dismiss". */
export function BankBalanceNotice({
  link,
  accountName,
  showName = true,
}: BankBalanceNoticeProps) {
  const locale = useLocale();
  const { resolve, busy } = useResolveBankBalance();
  if (link.balanceDifferenceMinor === null || link.bankBalanceMinor === null) {
    return null;
  }
  const bank = link.bankBalanceMinor;
  const ours = bank - link.balanceDifferenceMinor;
  const money = (minor: number) => formatMoney(minor, link.currency, locale);

  return (
    <div role="status" css={[corner.radius_3, stack.tight, styles.notice]}>
      <p css={[typeRole.bodySmall, styles.text]}>
        {showName ? <strong>{`${accountName} · `}</strong> : null}
        <span css={typeModifier.numeric}>
          {`${t({ en: "Bank says", zh: "银行显示" })} ${money(bank)} · ${t({
            en: "we say",
            zh: "账本显示",
          })} ${money(ours)}`}
        </span>
        {link.bankBalanceOn === null ? null : (
          <span css={styles.muted}>
            {` · ${displayDay(link.bankBalanceOn, locale, "day")}`}
          </span>
        )}
      </p>
      <div css={cluster.tight}>
        <Button
          size="sm"
          look="primary"
          loading={busy === `${link.id}:use`}
          onClick={() => {
            void resolve(link.id, "use");
          }}
        >
          {t({ en: "Use bank balance", zh: "采用银行余额" })}
        </Button>
        <Button
          size="sm"
          look="ghost"
          loading={busy === `${link.id}:dismiss`}
          onClick={() => {
            void resolve(link.id, "dismiss");
          }}
        >
          {t({ en: "Dismiss", zh: "忽略" })}
        </Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  notice: {
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderWarning,
    backgroundColor: color.bgWarningSubtle,
  },
  text: {
    margin: 0,
    color: color.fg,
  },
  muted: {
    color: color.fgMuted,
  },
});
