import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function TextLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/text"
      description={t({
        en: "The body-copy typography primitive. Choose the type role with look and the colour with tone, then pick the element with as — the semantic tag and the visual size stay decoupled.",
        zh: "正文文字排版基础组件。用 look 选择字体角色、用 tone 选择颜色，再用 as 选择元素——语义标签与视觉字号保持解耦。",
      })}
    >
      {children}
    </LabArticle>
  );
}
