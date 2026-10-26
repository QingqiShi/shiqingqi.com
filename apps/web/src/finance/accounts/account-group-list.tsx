"use client";

import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { List } from "@tuja/ui/components/list";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { Switch } from "@tuja/ui/components/switch";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { formatMoney } from "../domain/money/format-money.ts";
import { AccountRow, type AccountRowForm } from "./account-row.tsx";
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
  const form: AccountRowForm =
    useSplitViewColumn()?.column === "sidebar" ? "sidebar" : "card";
  const initials = useAccountInitials(sheet);
  const { collapsed, toggle } = useCollapsedGroups();
  const [showHidden, setShowHidden] = useState(false);
  const hiddenSwitchId = useId();
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
    <div css={form === "sidebar" ? stack.item : stack.group}>
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
            form={form}
            line={line}
            baseCurrency={baseCurrency}
            href={accountHref(line.account.id)}
            isSelected={selectedAccountId === line.account.id}
            initials={initials.get(line.account.id) ?? ""}
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
              css={form === "sidebar" && styles.group}
              open={!collapsed.has(section.group.id)}
              onOpenChange={(open) => {
                toggle(section.group.id, open);
              }}
              summary={
                <span css={[typeRole.label, styles.groupName]}>
                  {section.group.name}
                </span>
              }
              trailing={
                <span
                  css={[typeRole.label, typeModifier.numeric, styles.subtotal]}
                >
                  {formatMoney(section.subtotal, baseCurrency, locale)}
                </span>
              }
            >
              {lines.length === 0 ? (
                <p
                  css={[
                    typeRole.bodySmall,
                    styles.empty,
                    form === "card" && styles.body,
                  ]}
                >
                  {emptyGroup}
                </p>
              ) : form === "sidebar" ? (
                <ul role="list" css={styles.rows}>
                  {rows}
                </ul>
              ) : (
                <List css={styles.body}>{rows}</List>
              )}
            </Disclosure>
          </section>
        );
      })}
      <div css={[row.tight, styles.footer]}>
        {hiddenCount > 0 ? (
          <div css={row.tight}>
            <Switch
              id={hiddenSwitchId}
              value={showHidden ? "on" : "off"}
              onChange={(state) => {
                setShowHidden(state === "on");
              }}
            />
            <label
              htmlFor={hiddenSwitchId}
              css={[typeRole.bodySmall, styles.muted]}
            >
              {`${t({ en: "Show hidden accounts", zh: "显示隐藏的账户" })} (${new Intl.NumberFormat(locale).format(hiddenCount)})`}
            </label>
          </div>
        ) : null}
        <AnchorButton
          href={reorderHref}
          linkComponent={Link}
          size="sm"
          look="ghost"
          icon={<ArrowsDownUpIcon weight="bold" />}
          css={styles.reorder}
        >
          {t({ en: "Reorder", zh: "调整顺序" })}
        </AnchorButton>
      </div>
    </div>
  );
}

const styles = stylex.create({
  section: {
    scrollMarginBlockStart: space._5,
  },
  groupName: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  subtotal: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  // The Group's name and subtotal line up with the text of its rows, and
  // the rows take the full width for their selected background.
  group: {
    paddingInline: space._2,
  },
  body: {
    marginBlockStart: rhythm.tight,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    marginBlock: 0,
    marginInline: `calc(-1 * ${space._2})`,
    padding: 0,
    listStyle: "none",
  },
  empty: {
    margin: 0,
    color: color.fgMuted,
  },
  footer: {
    paddingInline: space._2,
  },
  reorder: {
    marginInlineStart: "auto",
  },
  muted: {
    color: color.fgMuted,
  },
});
