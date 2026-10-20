import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function ListLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/list"
      description={t({
        en: "Rows that each open something, on one bordered surface with a divider between them. Each row is a link or a button across its whole width, at least 48px tall, with a name, an optional detail line and a caret.",
        zh: "每一行都能打开某个内容，所有行位于同一个带边框的表面上，行与行之间有分隔线。每一行都是横跨全宽的链接或按钮，高度至少 48px，包含名称、可选的说明行和一个箭头。",
      })}
    >
      {children}
    </DocArticle>
  );
}
