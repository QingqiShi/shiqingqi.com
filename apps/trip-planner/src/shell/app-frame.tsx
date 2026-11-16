"use client";

import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
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
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SettingsSkeleton } from "./settings-skeleton.tsx";
import { TripsSkeleton } from "./trips-skeleton.tsx";

function TabLink(props: TabViewLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

/** The frame of every page but the offline page: Trips and Settings. */
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
  const inSettings = path === "/settings" || path.startsWith("/settings/");
  const appName = t({ en: "Trips", zh: "旅行计划" });

  return (
    <TabView
      label={appName}
      sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      linkComponent={TabLink}
      linkStatus={LinkStatus}
      defaultCollapsed={defaultCollapsed}
      header={<TabViewBrand name={appName} initials="Qi" detail="qingqi.dev" />}
      items={[
        {
          href: getLocalePath("/", locale),
          label: t({ en: "Trips", zh: "行程" }),
          icon: SuitcaseRollingIcon,
          current: !inSettings,
          skeleton: <TripsSkeleton />,
        },
        {
          href: getLocalePath("/settings", locale),
          label: t({ en: "Settings", zh: "设置" }),
          icon: GearSixIcon,
          current: inSettings,
          skeleton: <SettingsSkeleton />,
        },
      ]}
    >
      {children}
    </TabView>
  );
}
