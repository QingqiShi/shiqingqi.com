import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function TextareaLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/textarea"
      description={t({
        en: "A multi-line text input that shares TextField's label, description, and error chrome. Opt into auto-grow to have it expand with its content, or set a fixed row height the user can resize. Like TextField, it shows focus as a selected option card and sheds a little dust as you type.",
        zh: "多行文本输入框，与 TextField 共享标签、说明与错误样式。可启用自动增高使其随内容扩展，或设置固定行高供用户手动调整。与 TextField 一样，获得焦点时呈现选项卡片的选中样式，输入时散出少许微尘。",
      })}
    >
      {children}
    </LabArticle>
  );
}
