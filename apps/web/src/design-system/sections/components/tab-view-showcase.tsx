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
          en: "On a wide view the destinations stand in a sidebar with labels, at a medium width in a rail of icons, and on a phone they float in a tab bar. Beside the sidebar of a Navigation split view the rail stays on icons, and rail keeps one form at every width from md.",
          zh: "视图较宽时，目标页排在带标签的侧边栏中；中等宽度时排在图标侧轨中；在手机上则浮在标签栏中。在导航分栏视图的侧栏旁，侧轨保持图标形式；设置 rail，可在 md 及以上的各个宽度保持同一种形式。",
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
            en: "Only the sidebar shows secondary: give the screen another way to the same list.",
            zh: "只有侧边栏显示 secondary：请在画面上为同一个列表提供另一条途径。",
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
