import type { ReactNode } from "react";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import { t } from "#src/i18n.ts";

export default function ChipLayout({ children }: { children: ReactNode }) {
  return (
    <DocArticle
      path="/design-system/components/chip"
      description={t({
        en: "A compact interactive pill: a filter, a shortcut, a selectable option. It renders a link when given an href and a button otherwise, so it is always keyboard-reachable. If it can't be clicked, it's a Badge.",
        zh: "紧凑的可交互胶囊形控件：筛选项、快捷入口或可选项。传入 href 时渲染为链接，否则渲染为按钮，因此始终可用键盘访问。若不可点击，则应使用徽章。",
      })}
    >
      {children}
    </DocArticle>
  );
}
