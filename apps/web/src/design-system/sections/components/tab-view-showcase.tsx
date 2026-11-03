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
          en: "On a wide view the destinations stand in a rail. On a narrow one, as on a phone, the same ones float in a tab bar.",
          zh: "视图较宽时，目标页排在侧轨中。视图较窄时（例如在手机上），同一组目标页浮在标签栏中。",
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
            en: "Content goes under the bar: keep each layout clear of tabViewTokens.barClearance.",
            zh: "内容延伸到标签栏之下：每种布局都要避开 tabViewTokens.barClearance。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="tab-view" />
    </>
  );
}
