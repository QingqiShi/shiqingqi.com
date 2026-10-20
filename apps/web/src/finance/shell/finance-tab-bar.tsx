"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { TabBar, type TabBarLinkProps } from "@tuja/ui/components/tab-bar";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { color, layer, space } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { normalizePath } from "#src/i18n/normalize-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import { PendingScreenMarker } from "./finance-screen-slot.tsx";
import { tabBarTokens } from "./tab-bar.stylex.ts";
import { useFinanceDestinations } from "./use-finance-destinations.ts";
import { useSyncStatusSummary } from "./use-sync-status-summary.tsx";

function TabLink({ children, ...props }: TabBarLinkProps) {
  return (
    <Link {...props} prefetchOnIntent>
      {children}
      <PendingScreenMarker href={props.href} />
    </Link>
  );
}

/**
 * The five Finance destinations in a pill that floats above the bottom of the
 * screen, below `md`, where one tap switches screens. A dot on Transactions
 * says that changes wait to sync. A dot on Settings, where the full sync
 * status is, says that sync has a problem, and the link's name says which.
 */
export function FinanceTabBar() {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const destinations = useFinanceDestinations();
  const { status, label, attention } = useSyncStatusSummary();
  const waiting = status.pendingCount > 0;

  return (
    <EffectCarrier value="viewport-bottom">
      <TabBar
        label={t({ en: "Finance", zh: "家庭账本" })}
        linkComponent={TabLink}
        css={styles.bar}
        items={destinations.map((destination) => {
          const isSettings = destination.path === "/finance/settings";
          const dot =
            isSettings && attention
              ? attentionStyles[attention]
              : waiting && destination.path === "/finance/transactions"
                ? attentionStyles.waiting
                : null;
          return {
            href: getLocalePath(destination.path, locale),
            label: destination.label,
            icon: destination.icon,
            current: isCurrentDestination(current, destination.path),
            badge:
              dot === null ? null : (
                <span css={[corner.radius_round, styles.dot, dot]} />
              ),
            status: isSettings ? (attention ? label : null) : undefined,
          };
        })}
      />
    </EffectCarrier>
  );
}

const styles = stylex.create({
  // The pill is nearly as wide as the screen, but it is at the bottom, so it
  // never covers the top-centre point that iOS Safari samples for the status
  // bar colour.
  bar: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    insetInlineStart: pageGutter.inlineStart,
    insetInlineEnd: pageGutter.inlineEnd,
    insetBlockEnd: tabBarTokens.insetBlockEnd,
    zIndex: layer.header,
  },
  dot: {
    display: "block",
    inlineSize: space._1,
    blockSize: space._1,
  },
});

const attentionStyles = stylex.create({
  waiting: { backgroundColor: color.fgWarning },
  problem: { backgroundColor: color.fgDanger },
});
