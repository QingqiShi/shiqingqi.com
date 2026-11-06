import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function HeadingLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/heading"
      description={t({
        en: "The heading typography primitive. Keep ranks in document order with level, then pick any visual size with look — the two stay decoupled so the outline never fights the design.",
        zh: "标题文字排版基础组件。用 level 让层级遵循文档顺序，再用 look 选择任意视觉字号——二者解耦，让大纲不再与设计冲突。",
      })}
    >
      {children}
    </LabArticle>
  );
}
