import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";

export default function AvatarLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/avatar"
      description={t({
        en: "A medallion standing for one person or organisation: their portrait or logo when there is one, a monogram derived from their name when there isn't, and an optional corner badge for what they're doing. A person is a circle; an organisation is a rounded square.",
        zh: "代表某个人或机构的徽章：有头像或标志时显示它，没有时显示由姓名推导出的字母缩写，并可用角标表示其状态。人用圆形，机构用圆角方形。",
      })}
    >
      {children}
    </DocArticle>
  );
}
