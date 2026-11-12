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
import { Link, LinkStatus } from "@tuja/next-links/link";
import { StatusDot } from "@tuja/ui/components/status-dot";
import {
  TabView,
  TabViewLink,
  type TabViewLinkProps,
} from "@tuja/ui/components/tab-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AssistantLogo } from "../pwa/assistant-logo.tsx";
import { ReportsSkeleton } from "../report-page/reports-skeleton.tsx";
import { TodosSkeleton } from "../report-page/todos-skeleton.tsx";
import { SettingsSkeleton } from "../settings/settings-skeleton.tsx";
import { ScreenSkeleton } from "./screen-skeleton.tsx";
import { shownDestination, type DestinationPath } from "./shown-destination.ts";
import { RecordShownPath } from "./use-came-from.ts";

function TabLink(props: TabViewLinkProps) {
  return <Link {...props} prefetchOnIntent />;
}

/**
 * The frame of every signed-in page. From 34rem, the rail or the sidebar holds the
 * mark and the four destinations. Below 34rem, the tab bar holds the
 * destinations.
 */
export function AppFrame({
  mailboxNeedsYou,
  defaultCollapsed,
  children,
}: {
  /** A mailbox must be connected again: the Settings destination says so. */
  mailboxNeedsYou: boolean;
  /** The visitor collapsed the sidebar, from the cookie that the `TabView` keeps. */
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const locale = useLocale();
  const shown = shownDestination(normalizePath(usePathname()));
  const appName = t({ en: "Qi Assistant", zh: "Qi Assistant" });
  const todosLabel = t({ en: "To-dos", zh: "待办" });
  const activityLabel = t({ en: "Activity", zh: "动态" });
  const reconnectStatus = t({
    en: "A mailbox needs connecting again",
    zh: "有邮箱需要重新连接",
  });
  const destinations = [
    {
      path: "/",
      label: t({ en: "Today", zh: "今天" }),
      icon: SunIcon,
      skeleton: <ReportsSkeleton />,
    },
    {
      path: "/todos",
      label: todosLabel,
      icon: CheckSquareIcon,
      skeleton: <TodosSkeleton title={todosLabel} />,
    },
    {
      path: "/activity",
      label: activityLabel,
      icon: ClockCounterClockwiseIcon,
      skeleton: <ScreenSkeleton title={activityLabel} />,
    },
    {
      path: "/settings",
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
      skeleton: <SettingsSkeleton />,
    },
  ] satisfies {
    path: DestinationPath;
    label: string;
    icon: unknown;
    skeleton: ReactNode;
  }[];

  return (
    <>
      <Suspense fallback={null}>
        <RecordShownPath />
      </Suspense>
      <TabView
        sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
        label={appName}
        linkComponent={TabLink}
        linkStatus={LinkStatus}
        fallbackSkeleton={<ScreenSkeleton />}
        defaultCollapsed={defaultCollapsed}
        css={pageColumn.list}
        header={
          <TabViewLink
            href={getLocalePath("/", locale)}
            aria-label={appName}
            {...stylex.props(corner.radius_3, a11y.focusRing, styles.mark)}
          >
            <AssistantLogo css={styles.logo} />
          </TabViewLink>
        }
        items={destinations.map((destination) => ({
          href: getLocalePath(destination.path, locale),
          label: destination.label,
          icon: destination.icon,
          current: destination.path === shown,
          skeleton: destination.skeleton,
          ...(destination.path === "/settings"
            ? {
                badge: mailboxNeedsYou ? <StatusDot intent="warning" /> : null,
                status: mailboxNeedsYou ? reconnectStatus : null,
              }
            : {}),
        }))}
      >
        {children}
      </TabView>
    </>
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
