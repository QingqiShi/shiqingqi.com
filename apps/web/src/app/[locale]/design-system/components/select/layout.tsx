import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SelectLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/select"
      description={t({
        en: "A labelled wrapper around a native select, chosen for its built-in keyboard handling and platform picker. Feed choices through the options prop or drop down to option children for groups, with a themed chevron, placeholder, and error state.",
        zh: "对原生 select 的带标签封装，因其内置键盘处理与平台原生选择器而采用。可通过 options prop提供选项，或使用 option 子元素进行分组，并配有主题化下拉箭头、占位提示与错误状态。",
      })}
    >
      {children}
    </LabArticle>
  );
}
