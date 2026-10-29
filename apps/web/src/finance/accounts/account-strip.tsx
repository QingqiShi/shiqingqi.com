"use client";

import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import {
  SplitViewLink,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  font,
  rhythm,
} from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { useAccountInitials } from "./use-account-initials.ts";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

/**
 * The narrow form of the Net worth sidebar: the Household, then the
 * initials of each account that the list shows, in its order, with a rule
 * between two Groups. The initials are the list's, and the open account
 * has a ring.
 */
export function AccountStrip({
  sheet,
  url,
}: {
  sheet: BalanceSheet;
  url: NetWorthUrl;
}) {
  const accountName = useAccountDisplayName();
  const initials = useAccountInitials(sheet);
  const groups = sheet.sections
    .map((section) => ({
      id: section.group.id,
      name: section.group.name,
      lines: section.lines.filter((line) => line.hidden === null),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <nav
      aria-label={t({ en: "Accounts", zh: "账户" })}
      css={[styles.strip, styles.list]}
    >
      <StripLink
        href={url.hrefOf({ account: null })}
        label={t({ en: "Household", zh: "家庭" })}
        current={url.account === null}
        shared="household"
        isIcon
      >
        <HouseIcon weight="bold" />
      </StripLink>
      {groups.map((group) => (
        <ul
          key={group.id}
          role="list"
          aria-label={group.name}
          css={[styles.list, styles.group]}
        >
          {group.lines.map((line) => (
            <li key={line.account.id}>
              <StripLink
                href={url.hrefOf({ account: line.account.id })}
                label={accountName(line.account)}
                current={url.account === line.account.id}
                shared={`account:${line.account.id}`}
              >
                {initials.get(line.account.id)}
              </StripLink>
            </li>
          ))}
        </ul>
      ))}
    </nav>
  );
}

function StripLink({
  href,
  label,
  current,
  shared,
  isIcon = false,
  children,
}: {
  href: string;
  label: string;
  current: boolean;
  /** The Shared element that the link is the tile of, such as an account's. */
  shared: string;
  isIcon?: boolean;
  children: ReactNode;
}) {
  const sharedRef = useSplitViewShared(shared);
  return (
    <SplitViewLink
      ref={sharedRef}
      href={href}
      aria-label={label}
      title={label}
      aria-current={current ? "page" : undefined}
      {...stylex.props(
        typeRole.label,
        corner.radius_3,
        transition.colors,
        a11y.touchTarget,
        a11y.focusRing,
        styles.link,
        isIcon && styles.icon,
      )}
    >
      {children}
    </SplitViewLink>
  );
}

const CURRENT = "[aria-current=page]";

const styles = stylex.create({
  strip: {
    alignItems: "center",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  // A rule above each Group, as wide as an account.
  group: {
    paddingBlockStart: rhythm.tight,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    inlineSize: controlSize._8,
  },
  // The open account keeps its fill and takes a ring, so that it shows
  // which account the columns after the strip are about.
  link: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontWeight: font.weight_6,
    color: { default: color.fgMuted, [CURRENT]: color.fg },
    textDecoration: "none",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: {
      default: `inset 0 0 0 ${border.size_1} ${color.border}`,
      [CURRENT]: `inset 0 0 0 ${border.size_2} ${color.fg}`,
    },
  },
  icon: {
    fontSize: controlSize._5,
  },
});
