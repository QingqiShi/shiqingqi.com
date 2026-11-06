import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function CodeBlockLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/code-block"
      description={t({
        en: "Pass source for a static sample, or parts to let a change play like a code-walkthrough slide — what stays slides to its new place, what arrives rises in, and what leaves fades where it stood.",
        zh: "传入 source 呈现静态示例，或传入 parts，让改动像代码讲解幻灯片一样播放——保留的部分滑动到新位置，新增的部分升起淡入，离开的部分原地淡出。",
      })}
    >
      {children}
    </LabArticle>
  );
}
