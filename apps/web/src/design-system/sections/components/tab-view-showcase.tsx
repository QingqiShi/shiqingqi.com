import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { Suspense } from "react";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { TabViewDemo, TabViewDemoPlaceholder } from "./tab-view-specimens.tsx";

export function TabViewShowcase() {
  const usage = `import { TabView } from "@tuja/ui/components/tab-view";

<TabView
  label={appLabel}
  linkComponent={Link}
  header={<AppMark />}
  footer={<SignedInMember />}
  items={[
    { href: "/accounts", label: accounts, icon: WalletIcon, current: true },
    { href: "/reports", label: reports, icon: ChartBarIcon },
    { href: "/settings", label: settings, icon: GearSixIcon },
  ]}
>
  <Screen />
</TabView>`;

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
            zh: "框中是一个可操作的应用。选一个宽度：框宽于或等于md时，目标页排在侧轨中，当前的一个凸起在轨上，顶部是应用标志，底部是已登录的成员。与标签栏一样，凸起的表面是液体，会沿侧轨向上或向下涌向你按下的目标页，沿侧轨拖动也会移动它；框更窄时（例如在手机上），它们浮在底部的标签栏中。每个目标页显示自己的画面。",
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
            en: "items takes the same shape as TabBar's, badge and status included, and both forms show them. effect works as TabBar's, in both forms. header and footer show in the rail only: where the bar shows, give their content another place, such as a settings screen. The view picks its form from its own width with a container query, so the server paints the right one. Where the bar shows, the content goes under it, and tabViewTokens.barClearance is the strip the bar takes. Each layout in the content keeps its content, floating actions and sticky footers above it once: a Navigation split view does so for its columns.",
            zh: "items的形状与TabBar的相同，包括badge与status，两种形态都会显示它们。effect与TabBar的相同，两种形态都适用。header与footer只在侧轨中显示：显示标签栏时，请为其内容另找位置，例如设置页面。视图用容器查询按自身宽度选择形态，因此服务器直接绘制正确的一种。显示标签栏时，内容延伸到它之下，tabViewTokens.barClearance是标签栏所占的那一条。内容中的每种布局各自让内容、悬浮操作与粘性页脚留在它之上一次：导航分栏视图为其各栏这样做。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="tab-view" />
    </>
  );
}
