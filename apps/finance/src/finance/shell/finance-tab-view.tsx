"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { TabView, type TabViewLinkProps } from "@tuja/ui/components/tab-view";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Link, LinkStatus } from "#src/links/link.tsx";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import { FinanceScreenSkeleton } from "./finance-screen-skeleton.tsx";
import { useFinanceDestinations } from "./use-finance-destinations.ts";
import { useSyncStatusSummary } from "./use-sync-status-summary.tsx";

function TabLink(props: TabViewLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

interface FinanceTabViewProps {
  /** The top of the rail, at `md` and wider. */
  header?: ReactNode;
  /** The bottom of the rail, at `md` and wider. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The five Finance destinations: in the rail at `md` and wider, and in the
 * tab bar that floats above the bottom of the screen below `md`. A dot on
 * Transactions says that changes wait to sync. A dot on Settings, where the
 * full sync status is, says that sync has a problem, and the link's name says
 * which.
 */
export function FinanceTabView({
  header,
  footer,
  children,
}: FinanceTabViewProps) {
  const locale = useLocale();
  const current = normalizePath(usePathname());
  const destinations = useFinanceDestinations();
  const { status, label, attention } = useSyncStatusSummary();
  const waiting = status.pendingCount > 0;

  return (
    <TabView
      label={t({ en: "Finance", zh: "家庭账本" })}
      linkComponent={TabLink}
      linkStatus={LinkStatus}
      fallbackSkeleton={<FinanceScreenSkeleton path={current} />}
      header={header}
      footer={footer}
      items={destinations.map((destination) => {
        const isSettings = destination.path === "/settings";
        const dot =
          isSettings && attention
            ? attentionStyles[attention]
            : waiting && destination.path === "/transactions"
              ? attentionStyles.waiting
              : null;
        return {
          href: getLocalePath(destination.path, locale),
          label: destination.label,
          icon: destination.icon,
          current: isCurrentDestination(current, destination.path),
          skeleton: <FinanceScreenSkeleton path={destination.path} />,
          badge:
            dot === null ? null : (
              <span css={[corner.radius_round, styles.dot, dot]} />
            ),
          status: isSettings ? (attention ? label : null) : undefined,
        };
      })}
    >
      {children}
    </TabView>
  );
}

const styles = stylex.create({
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
