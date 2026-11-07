import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function ListLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/list"
      description={t({
        en: "Rows that each open something, on a bordered surface with a divider between them, or plain inside a card. Each row is a link or a button across its whole width, at least 48px tall, with a name, optional detail lines, a value at the end and a caret.",
        zh: "每一行都能打开某个内容，所有行位于带边框的表面上、行与行之间有分隔线，或以简洁形式放在卡片中。每一行都是横跨全宽的链接或按钮，高度至少 48px，包含名称、可选的说明行、末尾的数值和一个箭头。",
      })}
    >
      {children}
    </LabArticle>
  );
}
