import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function CalloutLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/callout"
      description={t({
        en: "An inline message or alert box. A token-themed subtle background, matching border, and tinted icon carry the Intent, and the box itself is the live region so its text is announced. Add a title for a heading, override or drop the icon, and pair onDismiss with a label for a close button.",
        zh: "行内消息或提醒框。令牌主题化的浅色背景、匹配的边框与着色图标共同传达意图色，框体本身即为 live region，会播报其文本。可添加标题、覆盖或移除图标，并将 onDismiss 与 label 搭配以提供关闭按钮。",
      })}
    >
      {children}
    </DocArticle>
  );
}
