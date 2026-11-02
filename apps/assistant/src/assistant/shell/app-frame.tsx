"use client";

import { CheckSquareIcon } from "@phosphor-icons/react/dist/ssr/CheckSquare";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import type { TabBarLinkProps } from "@tuja/ui/components/tab-bar";
import { TabView } from "@tuja/ui/components/tab-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Link } from "#src/links/link.tsx";
import { AssistantLogo } from "../pwa/assistant-logo.tsx";
import { shownDestination, type DestinationPath } from "./shown-destination.ts";

function TabLink(props: TabBarLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

/**
 * The frame of every signed-in page. At `md` and wider, the rail holds the
 * mark and the four destinations. Below `md`, the tab bar holds the
 * destinations.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const shown = shownDestination(normalizePath(usePathname()));
  const appName = t({ en: "Mail Assistant", zh: "邮件助手" });
  const destinations = [
    {
      path: "/",
      label: t({ en: "Today", zh: "今天" }),
      icon: SunIcon,
    },
    {
      path: "/todos",
      label: t({ en: "To-dos", zh: "待办" }),
      icon: CheckSquareIcon,
    },
    {
      path: "/activity",
      label: t({ en: "Activity", zh: "动态" }),
      icon: ClockCounterClockwiseIcon,
    },
    {
      path: "/settings",
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
    },
  ] satisfies { path: DestinationPath; label: string; icon: unknown }[];

  return (
    <TabView
      label={appName}
      linkComponent={TabLink}
      header={
        <Link
          href={getLocalePath("/", locale)}
          aria-label={appName}
          {...stylex.props(corner.radius_3, a11y.focusRing, styles.mark)}
        >
          <AssistantLogo css={styles.logo} />
        </Link>
      }
      screenKey={shown ?? undefined}
      items={destinations.map((destination) => ({
        href: getLocalePath(destination.path, locale),
        label: destination.label,
        icon: destination.icon,
        current: destination.path === shown,
      }))}
    >
      {children}
    </TabView>
  );
}

const styles = stylex.create({
  mark: {
    display: "inline-flex",
  },
  logo: {
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
});
