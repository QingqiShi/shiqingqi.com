import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function PageHeaderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/page-header"
      description={t({
        en: "The top of a page: its title, a sentence that says what the page is for, and the page's own actions.",
        zh: "页面的顶部：标题、一句说明页面用途的话，以及页面自身的操作。",
      })}
    >
      {children}
    </LabArticle>
  );
}
