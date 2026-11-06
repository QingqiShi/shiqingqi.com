import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function TableLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/table"
      description={t({
        en: "A static, semantic data table in its own scrolling region — a required caption names it, numeric columns line up digit for digit, and the head can hold at the top while the rows move under it.",
        zh: "位于独立滚动区域内的静态语义化数据表格——必填的 caption 为其命名，数字列逐位对齐，表头还可在各行滚过时保持固定。",
      })}
    >
      {children}
    </LabArticle>
  );
}
