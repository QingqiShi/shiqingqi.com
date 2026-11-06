import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function ProgressLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/progress"
      description={t({
        en: "A determinate meter for work of known length — it reports its value to a screen reader as well as drawing it, and leaves waits with no measurable end to Spinner.",
        zh: "用于长度已知的工作的确定型进度条——它既把数值画出来，也把数值报告给屏幕阅读器；没有明确终点的等待则交给 Spinner。",
      })}
    >
      {children}
    </LabArticle>
  );
}
