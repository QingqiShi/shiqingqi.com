import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function ButtonLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/button"
      description={t({
        en: "The primary action control, with a tactile press animation. Looks step from the default raised surface down through outline and ghost, plus primary and danger for the actions that carry weight; optional leading or icon-only content, and a busy state. For a related set of mutually exclusive choices, reach for SegmentedControl instead.",
        zh: "主要的操作控件，带有富有触感的按压动画。外观从默认的凸起表面依次弱化为描边与无框，另有用于重要操作的主要与危险两种；支持前置图标或纯图标内容，并可显示加载状态。若需要一组互斥的相关选项，请改用 SegmentedControl。",
      })}
    >
      {children}
    </DocArticle>
  );
}
