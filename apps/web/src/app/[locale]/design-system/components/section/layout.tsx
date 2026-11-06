import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SectionLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/section"
      description={t({
        en: "A labelled block of content. The label reads as quiet muted text because at this scale a section title is wayfinding rather than hierarchy — but it is still a real heading, so it can be navigated to.",
        zh: "带标签的内容区块。标签以柔和的弱化文字呈现——在这一层级，区块标题的作用是导航而非层级——但它仍是真实的标题元素，可被跳转访问。",
      })}
    >
      {children}
    </LabArticle>
  );
}
