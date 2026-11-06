import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function CardLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/card"
      description={t({
        en: "A bordered surface container. Static by default for panels and alerts; interactive for a clickable tile. When the whole card is a link, compose the surface onto a real anchor.",
        zh: "带描边的表面容器。默认为静态形态，用于面板与提示；可交互形态用于可点击的卡片。当整张卡片为链接时，将该表面组合到真实的锚点元素上。",
      })}
    >
      {children}
    </LabArticle>
  );
}
