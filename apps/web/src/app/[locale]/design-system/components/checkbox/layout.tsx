import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function CheckboxLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/checkbox"
      description={t({
        en: "A labelled checkbox built on a native input, so keyboard activation, focus, and label association come for free. Supports a tri-state indeterminate dash for select-all groups, a description, and an inline error message.",
        zh: "基于原生 input 的带标签复选框，键盘操作、聚焦与标签关联皆开箱即用。支持用于全选分组的三态中间横线状态、说明文字与内联错误提示。",
      })}
    >
      {children}
    </LabArticle>
  );
}
