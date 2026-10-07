import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function AvatarLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/avatar"
      description={t({
        en: "A circular medallion standing for one person: their portrait when there is one, a monogram derived from their name when there isn't, and an optional corner badge for what they're doing.",
        zh: "代表某个人的圆形徽章：有头像时显示头像，没有时显示由姓名推导出的字母缩写，并可用角标表示其状态。",
      })}
    >
      {children}
    </DocArticle>
  );
}
