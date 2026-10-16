import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function SheetLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/sheet"
      description={t({
        en: "A modal card over the dimmed page. Below md it floats at the bottom of the screen and a drag down puts it away; from md up it sits in the centre. It owns the dim, the focus trap, the scroll lock, Escape and the close button; you supply the content, the localised close label and where it portals.",
        zh: "压暗页面之上的模态卡片。在 md 以下它浮在屏幕底部，向下拖动即可收起；从 md 起居中显示。它负责暗化层、焦点捕获、滚动锁定、Escape 关闭与关闭按钮；使用方提供内容、本地化的关闭标签以及挂载位置。",
      })}
    >
      {children}
    </DocArticle>
  );
}
