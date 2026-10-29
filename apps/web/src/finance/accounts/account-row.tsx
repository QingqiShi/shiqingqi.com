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
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine } from "./build-balance-sheet.ts";
import { institutionIconUrl } from "./institution-icon-url.ts";
import { VALUATION_KINDS } from "./valuation-kinds.ts";

export type AccountRowForm = "sidebar" | "card";

interface AccountRowProps {
  /**
   * `"sidebar"` wraps the name and never cuts it. `"card"` is a row of a
   * `List`.
   */
  form: AccountRowForm;
  line: AccountLine;
  baseCurrency: string;
  href: string;
  isSelected: boolean;
  /** The initials that mark the account, the same as in the strip. */
  initials: string;
}

/**
 * One account in the Net worth list: its institution's icon over its
 * initials, its name with the owner and institution that tell it apart, its
 * balance, and the facts that matter for its kind. The row opens the
 * account.
 */
export function AccountRow({
  form,
  line,
  baseCurrency,
  href,
  isSelected,
  initials,
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
  const differs = account.currency !== baseCurrency;
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
      <span
        css={[
          row.inline,
          form === "sidebar" && typeRole.caption,
          styles.facts,
          form === "sidebar" && styles.muted,
        ]}
      >
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
  const amounts = (
    <span css={styles.amounts}>
      <span
        css={[
          form === "sidebar" ? typeRole.bodySmall : typeRole.body,
          typeModifier.numeric,
          styles.balance,
        ]}
      >
        {formatMoney(line.balance, account.currency, locale)}
      </span>
      {differs ? (
        <span css={[typeRole.caption, typeModifier.numeric, styles.converted]}>
          {`≈ ${formatMoney(line.baseBalance, baseCurrency, locale)}`}
        </span>
      ) : null}
    </span>
  );

  if (form === "card") {
    return (
      <ListRow
        href={href}
        linkComponent={SplitViewLink}
        aria-current={isSelected ? "true" : undefined}
        leading={avatar}
        detail={factLine}
        trailing={amounts}
      >
        {name}
      </ListRow>
    );
  }

  return (
    <li css={styles.item}>
      <SplitViewLink
        href={href}
        aria-current={isSelected ? "true" : undefined}
        {...stylex.props(
          corner.radius_3,
          transition.colors,
          selected.quiet,
          a11y.focusRingInset,
          styles.row,
        )}
      >
        {avatar}
        <span css={styles.main}>
          <span css={[typeRole.bodySmall, styles.name]}>{name}</span>
          {factLine}
        </span>
        {amounts}
      </SplitViewLink>
    </li>
  );
}

const styles = stylex.create({
  item: {
    display: "flex",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
    textDecoration: "none",
  },
  avatar: {
    display: "flex",
    flexShrink: 0,
  },
  main: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  name: {
    fontWeight: font.weight_5,
  },
  facts: {
    minInlineSize: 0,
  },
  muted: {
    color: color.fgMuted,
  },
  factText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  converted: {
    color: color.fgMuted,
  },
  amounts: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  balance: {
    fontWeight: font.weight_5,
  },
});
