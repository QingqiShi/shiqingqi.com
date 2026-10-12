import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function ToastLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/toast"
      description={t({
        en: "A short message about what an action did, on a capsule of Glass, with up to two actions such as Undo and a close button. ToastProvider shows one at a time at the bottom of the screen and announces it politely; useToast shows one from anywhere below it.",
        zh: "一条告知操作结果的短消息，显示在玻璃胶囊上，可附带撤销等操作与关闭按钮。ToastProvider 在屏幕底部一次只显示一条，并以礼貌方式播报；在它之下的任何位置都可以用 useToast 显示提示。",
      })}
    >
      {children}
    </DocArticle>
  );
}
