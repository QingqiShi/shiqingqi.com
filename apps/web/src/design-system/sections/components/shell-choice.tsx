import { t } from "@tuja/i18n";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { getDesignSystemRouteLabels } from "#src/design-system/route-copy/get-design-system-route-labels.ts";

/** Which of the four page shells a page takes. Each shell's page opens with it. */
export function ShellChoice() {
  const labels = getDesignSystemRouteLabels();

  return (
    <GuideSection
      title={t({
        en: "Choose the shell by what the page does.",
        zh: "按页面的用途选择骨架。",
      })}
      lead={t({
        en: "A page takes one shell, and each shell does one job.",
        zh: "一个页面只用一种骨架，每种骨架只做一件事。",
      })}
    >
      <GuideList
        items={[
          {
            term: t({
              en: "An app's few top-level destinations",
              zh: "应用的少数顶层目标页",
            }),
            value: labels["/design-system/components/tab-view"],
            note: t({
              en: "A sidebar on a wide screen, a rail of icons on a narrow one, a tab bar on a phone.",
              zh: "宽屏上是侧边栏，窄屏上是图标侧轨，手机上是标签栏。",
            }),
          },
          {
            term: t({
              en: "A screen with a list beside its content, or a detail",
              zh: "内容旁有列表或详情的画面",
            }),
            value: labels["/design-system/components/navigation-split-view"],
            note: t({
              en: "In a Tab view, the list joins the destinations in the one sidebar.",
              zh: "在标签视图里，列表与目标页排在同一个侧边栏中。",
            }),
          },
          {
            term: t({
              en: "A screen of one page",
              zh: "只有一页的画面",
            }),
            value: labels["/design-system/components/navigation-stack"],
            note: t({
              en: "In a Tab view or alone, with the way back at its top.",
              zh: "在标签视图里或单独使用，返回的路在顶部。",
            }),
          },
          {
            term: t({
              en: "A reading page that stands alone",
              zh: "独立的阅读页",
            }),
            value: labels["/design-system/components/header-footer-layout"],
            note: t({
              en: "Floating controls, a centred column and a footer.",
              zh: "悬浮控件、居中的内容列与页脚。",
            }),
          },
        ]}
      />
    </GuideSection>
  );
}
