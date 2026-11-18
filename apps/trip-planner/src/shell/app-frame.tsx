"use client";

import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import * as stylex from "@stylexjs/stylex";
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
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NewTripRailAction } from "#src/new-trip/new-trip-button.tsx";
import { NewTripProvider } from "#src/new-trip/new-trip-provider.tsx";
import { AppToasts } from "./app-toasts.tsx";
import { SettingsSkeleton } from "./settings-skeleton.tsx";
import { TripsLogo } from "./trips-logo.tsx";
import { TripsSkeleton } from "./trips-skeleton.tsx";

function TabLink(props: TabViewLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

/**
 * The frame of every page but the offline page: Trips and Settings. A
 * visitor who is not signed in gets the landing page at home, which stands
 * alone.
 */
export function AppFrame({
  signedIn,
  hasTrips,
  defaultCollapsed,
  children,
}: {
  signedIn: boolean;
  /** The visitor is a member of a trip. Without one, home is an empty state whose action is New trip. */
  hasTrips: boolean;
  /** The visitor collapsed the sidebar, from the cookie that the `TabView` keeps. */
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const locale = useLocale();
  const path = normalizePath(usePathname());
  const inSettings = path === "/settings" || path.startsWith("/settings/");
  const appName = t({ en: "Trips", zh: "旅行计划" });

  if (!signedIn && path === "/") return children;

  const view = (
    <TabView
      label={appName}
      sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      linkComponent={TabLink}
      linkStatus={LinkStatus}
      defaultCollapsed={defaultCollapsed}
      header={
        <>
          <TabViewBrand name={appName} mark={<TripsLogo css={styles.logo} />} />
          {signedIn && (hasTrips || path !== "/") ? (
            <NewTripRailAction />
          ) : null}
        </>
      }
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
      {/* A page can say a thing here that stays when the person goes to
          another page, such as that a trip is deleted. */}
      <AppToasts>{children}</AppToasts>
    </TabView>
  );
  return signedIn ? <NewTripProvider>{view}</NewTripProvider> : view;
}

const styles = stylex.create({
  logo: {
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
});
