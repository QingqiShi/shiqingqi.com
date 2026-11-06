import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function HeaderFooterLayoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/header-footer-layout"
      description={t({
        en: "The shell of a reading page: floating controls, a centred column and an optional footer.",
        zh: "阅读页的骨架：悬浮控件、居中的内容列与可选的页脚。",
      })}
    >
      {children}
    </LabArticle>
  );
}
