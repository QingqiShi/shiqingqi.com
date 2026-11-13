import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function NavigationSplitViewLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/navigation-split-view"
      description={t({
        en: "Up to three columns: a sidebar, the content that the page scrolls, and the detail of what is picked.",
        zh: "最多三栏：侧栏、随页面滚动的内容，以及所选项的详情。",
      })}
    >
      {children}
    </LabArticle>
  );
}
