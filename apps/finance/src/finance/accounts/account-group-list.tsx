"use client";

import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { List } from "@tuja/ui/components/list";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { formatMoney } from "../domain/money/format-money.ts";
import { AccountRow } from "./account-row.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { useAccountInitials } from "./use-account-initials.ts";
import { useCollapsedGroups } from "./use-collapsed-groups.ts";

interface AccountGroupListProps {
  sheet: BalanceSheet;
  baseCurrency: string;
  reorderHref: string;
  /** The URL that opens the account. */
  accountHref: (accountId: string) => string;
  /** The account open in the column after the list, if any. */
  selectedAccountId: string | null;
}

/**
 * The accounts by Group, each Group a section that folds, with its subtotal.
 * Closed and excluded accounts wait behind "Show hidden". Outside the
 * sidebar, each Group's accounts are one `List`.
 */
export function AccountGroupList({
  sheet,
  baseCurrency,
  reorderHref,
  accountHref,
  selectedAccountId,
}: AccountGroupListProps) {
  const locale = useLocale();
  const form = useSplitViewColumn()?.column === "sidebar" ? "plain" : "card";
  const initials = useAccountInitials(sheet);
  const { collapsed, toggle } = useCollapsedGroups();
  const [showHidden, setShowHidden] = useState(false);
  const emptyGroup = t({
    en: "No accounts in this group.",
    zh: "此分组没有账户。",
  });
  const hiddenCount = sheet.sections.reduce(
    (count, section) =>
      count + section.lines.filter((line) => line.hidden !== null).length,
    0,
  );

  return (
    <div css={form === "plain" ? stack.item : stack.group}>
      {sheet.sections.map((section) => {
        const lines = showHidden
          ? section.lines
          : section.lines.filter((line) => line.hidden === null);
        if (lines.length === 0 && section.lines.length > 0 && !showHidden) {
          return null;
        }
        const rows = lines.map((line) => (
          <AccountRow
            key={line.account.id}
            line={line}
            baseCurrency={baseCurrency}
            href={accountHref(line.account.id)}
            isSelected={selectedAccountId === line.account.id}
            initials={initials.get(line.account.id) ?? ""}
            caret={form === "card"}
          />
        ));
        return (
          <section
            key={section.group.id}
            id={`group-${section.group.id}`}
            aria-label={section.group.name}
            css={styles.section}
          >
            <Disclosure
              open={!collapsed.has(section.group.id)}
              onOpenChange={(open) => {
                toggle(section.group.id, open);
              }}
              summary={
                <Text as="span" look="label" weight="semibold" verbatim>
                  {section.group.name}
                </Text>
              }
              trailing={
                <Text as="span" look="label" weight="semibold" numeric>
                  {formatMoney(section.subtotal, baseCurrency, locale)}
                </Text>
              }
            >
              {lines.length === 0 ? (
                <Text
                  look="bodySmall"
                  tone="muted"
                  measure="none"
                  css={form === "card" && styles.body}
                >
                  {emptyGroup}
                </Text>
              ) : (
                <List
                  form={form}
                  density={form === "plain" ? "compact" : "regular"}
                  css={form === "card" && styles.body}
                >
                  {rows}
                </List>
              )}
            </Disclosure>
          </section>
        );
      })}
      <FlowBlock css={row.tight}>
        {hiddenCount > 0 ? (
          <Switch
            label={`${t({ en: "Show hidden accounts", zh: "显示隐藏的账户" })} (${new Intl.NumberFormat(locale).format(hiddenCount)})`}
            value={showHidden ? "on" : "off"}
            onChange={(state) => {
              setShowHidden(state === "on");
            }}
            css={styles.noWrap}
          />
        ) : null}
        <Button
          href={reorderHref}
          size="sm"
          look="ghost"
          icon={<ArrowsDownUpIcon weight="bold" />}
          aria-label={t({ en: "Reorder", zh: "调整顺序" })}
          css={styles.reorder}
        />
      </FlowBlock>
    </div>
  );
}

const styles = stylex.create({
  section: {
    scrollMarginBlockStart: space._5,
  },
  body: {
    marginBlockStart: rhythm.tight,
  },
  noWrap: {
    whiteSpace: "nowrap",
  },
  reorder: {
    marginInlineStart: "auto",
  },
});
