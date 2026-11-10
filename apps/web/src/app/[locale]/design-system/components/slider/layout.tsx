import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SliderLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/slider"
      description={t({
        en: "A single-value range control: a panel that springs from step to step in its groove, with the label and the value printed in, and a native input underneath for the keyboard and the screen reader.",
        zh: "单值滑块：面板在凹槽里随刻度弹动，标签和数值印在控件里，下面的原生输入负责键盘与读屏。",
      })}
    >
      {children}
    </LabArticle>
  );
}
