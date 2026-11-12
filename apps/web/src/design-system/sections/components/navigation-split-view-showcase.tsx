import { t } from "@tuja/i18n";
import { Suspense } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { FrameBreakout } from "./device-frame.tsx";
import {
  NavigationSplitViewDemo,
  NavigationSplitViewDemoPlaceholder,
  NavigationSplitViewLandingDemo,
  NavigationSplitViewLandingDemoPlaceholder,
} from "./navigation-split-view-specimens.tsx";
import { ShellChoice } from "./shell-choice.tsx";

export function NavigationSplitViewShowcase() {
  return (
    <>
      <ShellChoice />

      <GuideSection
        title={t({
          en: "Let the URL pick the columns.",
          zh: "让 URL 决定显示哪些栏。",
        })}
        lead={t({
          en: "Pass the columns that the URL picks, and the view fits them to its own width, not the screen's. Where the detail has no room beside the content, it opens in a sheet.",
          zh: "传入 URL 选中的各栏，视图按自身的宽度而不是屏幕的宽度排布它们。内容栏旁边放不下详情时，详情在面板中打开。",
        })}
      >
        <FrameBreakout>
          <Suspense fallback={<NavigationSplitViewDemoPlaceholder />}>
            <NavigationSplitViewDemo />
          </Suspense>
        </FrameBreakout>
        <GuideNote>
          {t({
            en: "Make each row a SplitViewLink: Back and Esc close one column, and J and K move between rows.",
            zh: "每一行都用 SplitViewLink：“返回”与 Esc 每次关闭一栏，J 与 K 在各行之间移动。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Give two forms of an element one name with useSplitViewShared, and one flies into the other.",
            zh: "用 useSplitViewShared 给元素的两种形态取同一个名字，一种形态就会飞成另一种。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Give the list a URL of its own.",
          zh: "给列表一个自己的 URL。",
        })}
        lead={t({
          en: "Where the sidebar has no room beside the content, it is the first page of a stack. A page with a back link to the list shows alone there, so a visitor lands on the content and goes back to pick another page.",
          zh: "内容旁放不下侧栏时，侧栏是堆叠的第一页。带有返回列表链接的页面在那里单独显示，于是访客先落在内容上，返回后再选别的页面。",
        })}
      >
        <FrameBreakout>
          <Suspense fallback={<NavigationSplitViewLandingDemoPlaceholder />}>
            <NavigationSplitViewLandingDemo />
          </Suspense>
        </FrameBreakout>
        <GuideNote>
          {t({
            en: "Outside a TabView, the sidebar takes a header, a footer and toggleLabel, the name of the button that collapses it.",
            zh: "不在 TabView 里时，侧栏可带 header、footer 与 toggleLabel，后者是收起按钮的名称。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "A view that does not fill the screen goes in a SheetBoundary.",
            zh: "不占满屏幕的视图要放进 SheetBoundary。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="navigation-split-view" />
    </>
  );
}
