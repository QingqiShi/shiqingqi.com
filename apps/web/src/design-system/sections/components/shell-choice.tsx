import { t } from "@tuja/i18n";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { getDesignSystemRouteLabels } from "#src/design-system/route-copy/get-design-system-route-labels.ts";

/** Which of the three page shells a page takes. Each shell's page opens with it. */
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
              en: "A sidebar or a rail on wide screens, and a floating tab bar on small ones.",
              zh: "宽屏上是侧边栏或侧轨，小屏上是悬浮标签栏。",
            }),
          },
          {
            term: t({
              en: "A screen or page with a sidebar",
              zh: "带侧栏的画面或页面",
            }),
            value: labels["/design-system/components/navigation-split-view"],
            note: t({
              en: "For a screen of one pane in a Tab view, leave out the sidebar.",
              zh: "标签视图中只有一栏的画面，不传入侧栏即可。",
            }),
          },
          {
            term: t({
              en: "A reading page with no sidebar",
              zh: "没有侧栏的阅读页",
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
