import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function TextFieldLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/text-field"
      description={t({
        en: "A single-line text input with a built-in label, optional helper text, and an accessible error state. Three sizes, leading and trailing adornment slots, and full native input props — server-renderable out of the box.",
        zh: "单行文本输入框，内置标签、可选的说明文字与无障碍的错误状态。提供三种尺寸、前置与后置装饰槽位，以及完整的原生 input 属性——开箱即可在服务端渲染。",
      })}
    >
      {children}
    </LabArticle>
  );
}
