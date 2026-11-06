import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function NavListLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/nav-list"
      description={t({
        en: "The links that move between the pages of one place, in one column: each link pads itself, the rows take no gap, and groups with a label set the larger steps.",
        zh: "在同一处的各页面之间切换的链接，排成一列：每个链接自带内边距，行间不留间距，带标签的分组设定更大的间距。",
      })}
    >
      {children}
    </LabArticle>
  );
}
