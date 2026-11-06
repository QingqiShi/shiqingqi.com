import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function BreadcrumbLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/breadcrumb"
      description={t({
        en: "The trail of ancestor pages above the current one: a named nav landmark, a link to every level that has a page, and the current page rendered as text rather than as a link to itself.",
        zh: "当前页面之上的上级路径：一个具名的 nav 地标、指向每个有页面的层级的链接，而当前页面渲染为文本，而非指向自身的链接。",
      })}
    >
      {children}
    </LabArticle>
  );
}
