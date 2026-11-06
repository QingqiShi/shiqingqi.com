import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function PagerLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/pager"
      description={t({
        en: "The previous and next links at the end of a page in a sequence, so a reader can go on without a trip back to the menu.",
        zh: "连续页面末尾的上一页与下一页链接，读者不必回到菜单就能继续读下去。",
      })}
    >
      {children}
    </LabArticle>
  );
}
