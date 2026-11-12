"use client";

import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { sidebarEdge } from "@tuja/ui/components/navigation-split-view.stylex";
import { Switch } from "@tuja/ui/components/switch";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useState } from "react";
import { formatMoney } from "../domain/money/format-money.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

interface AccountNavListProps {
  sheet: BalanceSheet;
  currency: string;
  url: NetWorthUrl;
  onCreateAccount: () => void;
}

/**
 * Net worth as a sidebar beside the content: the Household with today's net
 * worth, then every account by Group, each a row with its name and balance.
 * The figures, the trend and the facts of an account are in the content
 * column.
 */
export function AccountNavList({
  sheet,
  currency,
  url,
  onCreateAccount,
}: AccountNavListProps) {
  const locale = useLocale();
  const accountName = useAccountDisplayName();
  const [showHidden, setShowHidden] = useState(false);
  const hiddenCount = sheet.sections.reduce(
    (count, section) =>
      count + section.lines.filter((line) => line.hidden !== null).length,
    0,
  );

  return (
    <div css={stack.item}>
      <NavList linkComponent={SplitViewLink}>
        <NavLink
          href={url.hrefOf({ account: null, household: true })}
          current={url.account === null}
          trailing={formatMoney(sheet.netWorth, currency, locale, {
            wholeUnits: true,
          })}
        >
          {t({ en: "Household", zh: "家庭" })}
        </NavLink>
        {sheet.sections.map((section) => {
          const lines = showHidden
            ? section.lines
            : section.lines.filter((line) => line.hidden === null);
          if (lines.length === 0) return null;
          return (
            <NavGroup
              key={section.group.id}
              label={
                <span css={styles.groupLabel}>
                  <span css={typeModifier.verbatim}>{section.group.name}</span>
                  <span css={typeModifier.numeric}>
                    {formatMoney(section.subtotal, currency, locale, {
                      wholeUnits: true,
                    })}
                  </span>
                </span>
              }
            >
              {lines.map((line) => (
                <NavLink
                  key={line.account.id}
                  href={url.hrefOf({ account: line.account.id })}
                  current={url.account === line.account.id}
                  trailing={formatMoney(
                    line.balance,
                    line.account.currency,
                    locale,
                  )}
                >
                  <span css={[typeModifier.verbatim, styles.name]}>
                    {accountName(line.account)}
                  </span>
                </NavLink>
              ))}
            </NavGroup>
          );
        })}
      </NavList>
      <div css={[row.tight, sidebarEdge.text]}>
        {hiddenCount > 0 ? (
          <Switch
            label={`${t({ en: "Hidden", zh: "隐藏的账户" })} (${new Intl.NumberFormat(locale).format(hiddenCount)})`}
            value={showHidden ? "on" : "off"}
            onChange={(state) => {
              setShowHidden(state === "on");
            }}
            css={styles.noWrap}
          />
        ) : null}
        <span css={[row.tight, styles.end]}>
          <Button
            href={url.modeHref("reorder")}
            size="sm"
            look="ghost"
            icon={<ArrowsDownUpIcon weight="bold" />}
            aria-label={t({ en: "Reorder", zh: "调整顺序" })}
          />
          <Button
            size="sm"
            look="ghost"
            icon={<PlusIcon weight="bold" />}
            aria-label={t({ en: "Add account", zh: "添加账户" })}
            onClick={onCreateAccount}
          />
        </span>
      </div>
    </div>
  );
}

const styles = stylex.create({
  groupLabel: {
    display: "flex",
    justifyContent: "space-between",
  },
  name: {
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noWrap: {
    whiteSpace: "nowrap",
  },
  end: {
    marginInlineStart: "auto",
  },
});
