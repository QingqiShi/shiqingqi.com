import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function OptionCardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/option-card"
      description={t({
        en: "The card-sized answer to a question: an icon, a label, a description, and a selection mark on one tappable surface — a radiogroup when only one answer is right, independent checkboxes when several are.",
        zh: "以卡片作答的选择控件：图标、标签、说明与选中标记同处一个可点击的表面——只有一个答案时是单选组，可以多选时则是各自独立的复选框。",
      })}
    >
      {children}
    </LabArticle>
  );
}
