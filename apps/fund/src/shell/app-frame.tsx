"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { LightbulbIcon } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { NotebookIcon } from "@phosphor-icons/react/dist/ssr/Notebook";
import { ShieldWarningIcon } from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import {
  TabView,
  TabViewBrand,
  type TabViewLinkProps,
} from "@tuja/ui/components/tab-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "#src/fund/ui/sign-out-button.tsx";
import { ScreenSkeleton } from "./screen-skeleton.tsx";

function TabLink(props: TabViewLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

function isCurrent(destination: string, path: string) {
  if (destination === "/") return path === "/";
  return path === destination || path.startsWith(`${destination}/`);
}

/**
 * The frame of every signed-in page, with the five destinations of the
 * fund. From 34rem they are in the rail or the sidebar, and below 34rem in
 * the tab bar.
 */
export function AppFrame({
  defaultCollapsed,
  children,
}: {
  /** The visitor collapsed the sidebar, from the cookie that the `TabView` keeps. */
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const locale = useLocale();
  const path = normalizePath(usePathname());
  const appName = t({ en: "Paper Fund", zh: "模拟基金" });
  const destinations = [
    {
      path: "/",
      label: t({ en: "Desk", zh: "交易台" }),
      icon: ArrowsLeftRightIcon,
    },
    {
      path: "/portfolio",
      label: t({ en: "Portfolio", zh: "持仓" }),
      icon: ChartPieSliceIcon,
    },
    {
      path: "/thesis",
      label: t({ en: "Thesis", zh: "投资逻辑" }),
      icon: LightbulbIcon,
    },
    {
      path: "/risk",
      label: t({ en: "Risk", zh: "风险" }),
      icon: ShieldWarningIcon,
    },
    {
      path: "/journal",
      label: t({ en: "Journal", zh: "日志" }),
      icon: NotebookIcon,
    },
  ];

  return (
    <TabView
      label={appName}
      sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      linkComponent={TabLink}
      linkStatus={LinkStatus}
      fallbackSkeleton={<ScreenSkeleton />}
      defaultCollapsed={defaultCollapsed}
      css={pageColumn.list}
      header={
        <TabViewBrand
          name={appName}
          detail={t({ en: "AI portfolio manager", zh: "AI 投资组合经理" })}
        />
      }
      footer={<SignOutButton iconOnly />}
      items={destinations.map((destination) => ({
        href: getLocalePath(destination.path, locale),
        label: destination.label,
        icon: destination.icon,
        current: isCurrent(destination.path, path),
        skeleton: <ScreenSkeleton title={destination.label} />,
      }))}
    >
      {children}
    </TabView>
  );
}
