import { t } from "@tuja/i18n";
import { Suspense } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { FrameBreakout } from "./device-frame.tsx";
import { ShellChoice } from "./shell-choice.tsx";
import { TabViewDemo, TabViewDemoPlaceholder } from "./tab-view-specimens.tsx";

export function TabViewShowcase() {
  return (
    <>
      <ShellChoice />

      <GuideSection
        title={t({
          en: "Keep an app's destinations in reach at every width.",
          zh: "在任何宽度下都让应用的目标页触手可及。",
        })}
        lead={t({
          en: "On a wide view the destinations stand in a sidebar with labels, on a narrow one in a rail of icons, and on a phone they float in a tab bar. A screen with a list puts it in the same sidebar, under the destinations.",
          zh: "视图较宽时，目标页排在带标签的侧边栏中；较窄时排在图标侧轨中；在手机上则浮在标签栏中。带列表的画面把列表放进同一个侧边栏，排在目标页下方。",
        })}
      >
        <FrameBreakout>
          <Suspense fallback={<TabViewDemoPlaceholder />}>
            <TabViewDemo />
          </Suspense>
        </FrameBreakout>
        <GuideNote>
          {t({
            en: "The tab bar comes only with Tab view.",
            zh: "标签栏只能通过标签视图使用。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The visitor can collapse the sidebar to the rail; pass defaultCollapsed from the cookie so the first paint agrees.",
            zh: "访客可以把侧边栏收成图标侧轨；把 cookie 的值传给 defaultCollapsed，首次绘制就与之一致。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Content goes under the bar: keep each layout clear of tabViewTokens.barClearance.",
            zh: "内容延伸到标签栏之下：每种布局都要避开 tabViewTokens.barClearance。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="tab-view" />
    </>
  );
}
