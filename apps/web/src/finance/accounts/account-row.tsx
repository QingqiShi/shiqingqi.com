"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine } from "./build-balance-sheet.ts";
import { VALUATION_KINDS } from "./valuation-kinds.ts";

interface AccountRowProps {
  line: AccountLine;
  baseCurrency: string;
  href: string;
  isSelected: boolean;
}

/**
 * One account in the Net worth list: its name with the owner and
 * institution that tell it apart, its balance, and the facts that matter for
 * its kind. The row opens the account.
 */
export function AccountRow({
  line,
  baseCurrency,
  href,
  isSelected,
}: AccountRowProps) {
  const locale = useLocale();
  const accountName = useAccountDisplayName();
  const { account } = line;
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

  return (
    <li css={styles.item}>
      <Link
        href={href}
        aria-current={isSelected ? "true" : undefined}
        {...stylex.props(
          corner.radius_2,
          transition.colors,
          selected.quiet,
          a11y.focusRing,
          styles.link,
        )}
      >
        <span css={styles.main}>
          <span css={[typeRole.body, styles.name]}>{name}</span>
          {facts.length > 0 || line.hidden !== null ? (
            <span css={[typeRole.caption, row.inline, styles.facts]}>
              {line.hidden === null ? null : (
                <Badge size="sm" intent="neutral">
                  {line.hidden === "closed"
                    ? t({ en: "Closed", zh: "已关闭" })
                    : t({ en: "Not counted", zh: "不计入" })}
                </Badge>
              )}
              <span css={styles.factText}>{facts.join(" · ")}</span>
            </span>
          ) : null}
        </span>
        <span css={styles.amounts}>
          <span css={[typeRole.body, typeModifier.numeric, styles.balance]}>
            {formatMoney(line.balance, account.currency, locale)}
          </span>
          {differs ? (
            <span css={[typeRole.caption, typeModifier.numeric, styles.facts]}>
              {`≈ ${formatMoney(line.baseBalance, baseCurrency, locale)}`}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

const styles = stylex.create({
  item: {
    display: "flex",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
    textDecoration: "none",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  name: {
    fontWeight: font.weight_5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  facts: {
    color: color.fgMuted,
    minInlineSize: 0,
  },
  factText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
