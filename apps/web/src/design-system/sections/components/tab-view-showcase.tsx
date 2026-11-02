import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { Suspense } from "react";
import { GuideNote } from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { TabViewDemo, TabViewDemoPlaceholder } from "./tab-view-specimens.tsx";

export function TabViewShowcase() {
  const usage = `import {
  TabView,
  TabViewSkeleton,
  type TabLinkStatusProps,
} from "@tuja/ui/components/tab-view";
import Link, { useLinkStatus } from "next/link";

function TabLinkStatus({ children }: TabLinkStatusProps) {
  return children(useLinkStatus().pending);
}

<TabView
  label={appLabel}
  linkComponent={Link}
  linkStatus={TabLinkStatus}
  header={<AppMark />}
  footer={<SignedInMember />}
  items={[
    {
      href: "/accounts",
      label: accounts,
      icon: WalletIcon,
      skeleton: <AccountsSkeleton />,
      current: true,
    },
    {
      href: "/reports",
      label: reports,
      icon: ChartBarIcon,
      skeleton: <ReportsSkeleton />,
    },
    {
      href: "/settings",
      label: settings,
      icon: GearSixIcon,
      skeleton: <SettingsSkeleton />,
    },
  ]}
>
  <Screen />
</TabView>

export default function Loading() { return <TabViewSkeleton />; }`;

  return (
    <>
      <Showcase
        label={t({ en: "App frame", zh: "应用框架" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "A live app in a frame. Pick a width: where the frame is md wide or wider, the destinations stand in the rail, the current one raised on it, with the app's mark at the top and the signed-in member at the bottom. As on the Tab bar, the raised surface is liquid that pours up or down the rail to the destination you press, and a drag along the rail moves it. Where it is narrower, as on a phone, they float in a Tab bar at the bottom. Each destination shows its own screen.",
            zh: "框中是一个可操作的应用。选一个宽度：框宽于或等于 md 时，目标页排在侧轨中，当前的一个凸起在轨上，顶部是应用标志，底部是已登录的成员。与标签栏一样，凸起的表面是液体，会沿侧轨向上或向下涌向你按下的目标页，沿侧轨拖动也会移动它；框更窄时（例如在手机上），它们浮在底部的标签栏中。每个目标页显示自己的画面。",
          })}
        </ShowcaseHelper>
        <Suspense fallback={<TabViewDemoPlaceholder />}>
          <TabViewDemo />
        </Suspense>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet code={usage} label="tsx" />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "linkStatus is a component the view renders inside each link, so that a router hook can read that link's state: with Next, pass it with the matching Link, and with a plain anchor, pass null. With it, a tap makes its destination current at once, and a screen that takes more than a moment to load shows its skeleton from items until it is ready; with null, the current item follows items and no skeleton shows.",
            zh: "linkStatus 是视图渲染在每个链接内部的组件，让路由器的 hook 能读取该链接的状态：使用 Next 时，把它和对应的 Link 一起传入；使用原生锚点时，传入 null。有了它，按下后目标页立即成为当前项，画面需要加载片刻时，会一直显示 items 中它的 skeleton，直到画面就绪；传入 null 时，当前项跟随 items，也不显示骨架屏。",
          })}
        </Text>
        <GuideNote>
          {t({
            en: "items takes TabBar's shape, badge and status included, plus a skeleton for each screen; effect works as on TabBar.",
            zh: "items 的形状与 TabBar 的相同，包括 badge 与 status，另加每个画面的 skeleton；effect 与 TabBar 的相同。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "In a route's loading fallback, TabViewSkeleton shows the skeleton of the opening destination, or fallbackSkeleton on a page outside every destination; useTabViewOpening gives that destination's href.",
            zh: "在路由的加载回退中，TabViewSkeleton 显示正在打开的目标页的骨架屏，不属于任何目标页的页面上则显示 fallbackSkeleton；useTabViewOpening 给出该目标页的 href。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "header and footer show in the rail only. Where the bar shows, the content goes under it, so each layout keeps clear of tabViewTokens.barClearance.",
            zh: "header 与 footer 只在侧轨中显示。显示标签栏时，内容延伸到它之下，因此内容中的每种布局都要避开 tabViewTokens.barClearance。",
          })}
        </GuideNote>
      </Showcase>

      <PropsTable component="tab-view" />
    </>
  );
}
