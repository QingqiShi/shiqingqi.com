import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function StickyControlsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/sticky-controls"
      description={t({
        en: "A row of page chrome that holds under the header strip while the page scrolls past it, blurring the page around its controls the whole time it holds there and melting away as soon as it is back in the flow of the page. It parks at the clearance the header's own control groups occupy, and paints its blur on the page's Blur plane, under every control on the page.",
        zh: "一行页面控件，在页面从其下方滚过时停在页头下方；停住期间页面在其控件周围渐进虚化，一旦回到页面的文档流中，虚化随即消退。它停放的位置正是页头自身控件组所占的那段间距，虚化则绘制在页面的虚化平面上，位于页面全部控件之下。",
      })}
    >
      {children}
    </LabArticle>
  );
}
