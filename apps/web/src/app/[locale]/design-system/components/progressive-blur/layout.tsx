import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function ProgressiveBlurLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/progressive-blur"
      description={t({
        en: "The page blurred around whatever floats, in place of dimming it — strongest nearest the element, easing back to sharp further out. The radius is set per element, within a cap, and the blur can melt away and back.",
        zh: "在悬浮元素周围将页面渐进虚化，以取代压暗——越靠近元素越模糊，越远处越清晰。虚化半径按元素设定且有上限，虚化还可平滑地消失与恢复。",
      })}
    >
      {children}
    </LabArticle>
  );
}
