import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function HeadingLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/heading"
      description={t({
        en: "The type that a title is set in. level keeps the ranks in document order and look picks the visual size, so the outline never fights the design. For the title at the top of a page, use PageHeader, which puts this heading with a description and the page's actions.",
        zh: "标题所用的文字排版。level 让层级遵循文档顺序，look 选择视觉字号，大纲因此不会与设计冲突。页面顶部的标题请用 PageHeader，它把这个标题与说明、页面操作放在一起。",
      })}
    >
      {children}
    </LabArticle>
  );
}
