import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";

export default function SheetLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/sheet"
      description={t({
        en: "A modal card over the dimmed page. On a phone it floats at the bottom of the screen and a drag down puts it away; on a tablet or a desktop it sits in the centre. It owns the dimmed page, the focus trap, the scroll lock, Escape and the close button; you supply the content and the localised close label.",
        zh: "压暗页面之上的模态卡片。在手机上它浮在屏幕底部，向下拖动即可收起；在平板和桌面上居中显示。它负责压暗页面、焦点捕获、滚动锁定、Escape 关闭与关闭按钮；使用方提供内容和本地化的关闭标签。",
      })}
    >
      {children}
    </DocArticle>
  );
}
