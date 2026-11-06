import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function ScrollMaskLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/scroll-mask"
      description={t({
        en: "A scroll region whose content blurs on its way out of view at each edge it can still scroll to, so the region reads as continuing rather than stopping at a line. An edge masks only while there is scrolled-away content past it, so a region resting at its start carries no mask there, and one whose content fits carries none at all.",
        zh: "滚动区域在仍可继续滚动的每条边上，将移出视野的内容渐进虚化，让区域读起来是延续的，而不是在一条线上戛然而止。只有当某条边之外还有已滚过的内容时，该边才会虚化；停在起点的区域在起点一侧没有虚化，内容放得下的区域则完全没有。",
      })}
    >
      {children}
    </LabArticle>
  );
}
