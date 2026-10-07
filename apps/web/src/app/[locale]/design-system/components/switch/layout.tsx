import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function SwitchLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/switch"
      description={t({
        en: "A draggable, three-state toggle. Click, drag the thumb, or use the keyboard — on, off, and an indeterminate middle state, controlled or uncontrolled.",
        zh: "可拖动的三态开关。支持点击、拖动滑块或键盘操作——开启、关闭以及居中的未定状态，可受控或非受控使用。",
      })}
    >
      {children}
    </DocArticle>
  );
}
