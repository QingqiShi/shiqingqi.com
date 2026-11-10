"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { ListRow } from "@tuja/ui/components/list-row";
import {
  SplitViewLink,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine } from "./build-balance-sheet.ts";
import { institutionIconUrl } from "./institution-icon-url.ts";
import { VALUATION_KINDS } from "./valuation-kinds.ts";

interface AccountRowProps {
  line: AccountLine;
  baseCurrency: string;
  href: string;
  isSelected: boolean;
  /** The initials that mark the account, the same as in the strip. */
  initials: string;
  /** Whether the row shows that it opens in place of the list. */
  caret: boolean;
}

/**
 * One account in the Net worth list: its institution's icon over its
 * initials, its name with the owner and institution that tell it apart, its
 * balance, and the facts that matter for its kind. The row opens the
 * account.
 */
export function AccountRow({
  line,
  baseCurrency,
  href,
  isSelected,
  initials,
  caret,
}: AccountRowProps) {
  const locale = useLocale();
  const accountName = useAccountDisplayName();
  const { account } = line;
  const avatarRef = useSplitViewShared(`account:${account.id}`);
  const name = accountName(account);
  const facts: string[] = [];
  const detail = accountDetailLine(account, line.ownerName);
  if (detail) facts.push(detail);
  if (line.available !== null) {
    facts.push(
      `${formatMoney(line.available, account.currency, locale)} ${t({
        en: "available",
        zh: "可用",
      })}`,
    );
  }
  if (VALUATION_KINDS.has(account.kind) && line.lastValuationOn !== null) {
    facts.push(
      `${t({ en: "Updated", zh: "更新于" })} ${displayDay(
        line.lastValuationOn,
        locale,
        "day",
      )}`,
    );
  }
  const avatar = (
    <span ref={avatarRef} css={styles.avatar}>
      <Avatar
        name={name}
        initials={initials}
        src={institutionIconUrl(account)}
        shape="square"
        aria-hidden
      />
    </span>
  );
  const factLine =
    facts.length > 0 || line.hidden !== null ? (
      <span css={[row.inline, styles.facts]}>
        {line.hidden === null ? null : (
          <Badge size="sm" intent="neutral">
            {line.hidden === "closed"
              ? t({ en: "Closed", zh: "已关闭" })
              : t({ en: "Not counted", zh: "不计入" })}
          </Badge>
        )}
        <span css={styles.factText}>{facts.join(" · ")}</span>
      </span>
    ) : null;

  return (
    <ListRow
      href={href}
      linkComponent={SplitViewLink}
      aria-current={isSelected ? "true" : undefined}
      caret={caret}
      leading={avatar}
      detail={factLine}
      value={formatMoney(line.balance, account.currency, locale)}
      valueDetail={
        account.currency === baseCurrency
          ? null
          : `≈ ${formatMoney(line.baseBalance, baseCurrency, locale)}`
      }
    >
      <span css={typeModifier.verbatim}>{name}</span>
    </ListRow>
  );
}

const styles = stylex.create({
  avatar: {
    display: "flex",
    flexShrink: 0,
  },
  facts: {
    minInlineSize: 0,
  },
  factText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});
