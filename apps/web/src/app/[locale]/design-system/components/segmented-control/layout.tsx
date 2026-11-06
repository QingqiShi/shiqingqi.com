import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SegmentedControlLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LabArticle
      path="/design-system/components/segmented-control"
      description={t({
        en: "A single-select track whose options are all visible at once. Use it for two to four mutually exclusive views of the same content; a longer or open-ended list belongs in a Select.",
        zh: "所有选项同时可见的单选轨道。适用于同一内容的二至四种互斥视图；更长或开放式的选项列表应使用下拉选择。",
      })}
    >
      {children}
    </LabArticle>
  );
}
