import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function DividerLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/divider"
      description={t({
        en: "Visual separators for content. Subtle for in-flow breaks, bold for stronger separation, decorative for accent moments.",
        zh: "用于分隔内容的视觉元素。柔和用于自然分段，强烈用于明显分隔，装饰用于点缀重点。",
      })}
    >
      {children}
    </LabArticle>
  );
}
