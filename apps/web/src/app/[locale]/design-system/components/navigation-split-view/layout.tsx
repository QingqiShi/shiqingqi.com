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
        en: "Up to three columns, each with its own scroll: a sidebar, the content, and the detail of what is picked.",
        zh: "最多三栏，每栏各自滚动：侧栏、内容，以及所选项的详情。",
      })}
    >
      {children}
    </LabArticle>
  );
}
