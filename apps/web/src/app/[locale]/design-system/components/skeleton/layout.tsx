import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SkeletonLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/skeleton"
      description={t({
        en: "Placeholder shapes that hold a layout's space while content loads. Size them explicitly, let them fill their container, or stagger their pulse across a group.",
        zh: "在内容加载时占位的骨架形状。可以显式设定尺寸、让其填满容器，或让一组骨架的脉动错峰呈现。",
      })}
    >
      {children}
    </LabArticle>
  );
}
