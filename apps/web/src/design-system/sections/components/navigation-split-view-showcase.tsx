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
  NavigationSplitViewDrawerDemo,
  NavigationSplitViewDrawerDemoPlaceholder,
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
          en: "Say where the sidebar goes when it does not fit.",
          zh: "说明侧栏放不下时的去向。",
        })}
        lead={t({
          en: "A documentation site opens it from a menu button, a settings screen makes it the root of a stack, and a screen with another way in leaves it out.",
          zh: "文档站从菜单按钮打开它，设置画面让它成为堆叠的根页面，另有入口的画面则不显示它。",
        })}
      >
        <FrameBreakout>
          <Suspense fallback={<NavigationSplitViewDrawerDemoPlaceholder />}>
            <NavigationSplitViewDrawerDemo />
          </Suspense>
        </FrameBreakout>
        <GuideNote>
          {t({
            en: 'The prop is stacked, with "drawer", "page" or "hidden". With "drawer", the page scrolls the content.',
            zh: '对应的 prop 是 stacked，取值为 "drawer"、"page" 或 "hidden"。取 "drawer" 时，由页面滚动内容。',
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Clear the menu button with headerControlsTokens.inlineEndClearance.",
            zh: "用 headerControlsTokens.inlineEndClearance 避开菜单按钮。",
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
