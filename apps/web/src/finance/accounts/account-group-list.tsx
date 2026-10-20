"use client";

import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { List } from "@tuja/ui/components/list";
import { Switch } from "@tuja/ui/components/switch";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useId, useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { formatMoney } from "../domain/money/format-money.ts";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUrlSelection } from "../shell/use-url-selection.ts";
import { AccountRow } from "./account-row.tsx";
import { BankBalanceSummary } from "./bank-balance-notice.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { useCollapsedGroups } from "./use-collapsed-groups.ts";

interface AccountGroupListProps {
  sheet: BalanceSheet;
  baseCurrency: string;
  reorderHref: string;
}

/**
 * The accounts by Group, each Group a section that folds, with its subtotal.
 * Closed and excluded accounts wait behind "Show hidden". A Bank link whose
 * balance disagrees sits at the top of its Group.
 */
export function AccountGroupList({
  sheet,
  baseCurrency,
  reorderHref,
}: AccountGroupListProps) {
  const locale = useLocale();
  const isWide = useIsWideLayout();
  const selection = useUrlSelection("account");
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

  const hrefOf = (accountId: string) =>
    isWide
      ? selection.hrefWith(accountId)
      : getLocalePath(`/finance/accounts/${accountId}`, locale);

  return (
    <div css={stack.group}>
      {sheet.sections.map((section) => {
        const lines = showHidden
          ? section.lines
          : section.lines.filter((line) => line.hidden === null);
        if (lines.length === 0 && section.lines.length > 0 && !showHidden) {
          return null;
        }
        const notices = lines.filter(
          (line) => line.bankLink?.balanceDifferenceMinor != null,
        );
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
              <div css={[stack.tight, styles.body]}>
                {notices.map((line) =>
                  line.bankLink ? (
                    <BankBalanceSummary
                      key={line.bankLink.id}
                      link={line.bankLink}
                      account={line.account}
                      href={hrefOf(line.account.id)}
                    />
                  ) : null,
                )}
                {lines.length === 0 ? (
                  <p css={[typeRole.bodySmall, styles.empty]}>{emptyGroup}</p>
                ) : (
                  <List>
                    {lines.map((line) => (
                      <AccountRow
                        key={line.account.id}
                        line={line}
                        baseCurrency={baseCurrency}
                        href={hrefOf(line.account.id)}
                        isSelected={
                          isWide && selection.value === line.account.id
                        }
                      />
                    ))}
                  </List>
                )}
              </div>
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
  body: {
    paddingBlockStart: space._1,
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
