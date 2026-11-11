import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SpinnerLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/spinner"
      description={t({
        en: "An indeterminate loading indicator — a gapped ring that spins smoothly. Sizes map to rem so it scales with the user's font size; tone inherits the surrounding text colour or pins the primary colour. It needs an accessible name via label, unless it sits inside an already-labelled busy region, where it should be aria-hidden.",
        zh: "不确定型加载指示器——平滑旋转的缺口圆环。尺寸以 rem 表示，随用户字号缩放；色调可继承周围文本颜色或固定主色。它需要通过 label 提供无障碍名称，除非位于已带标签的繁忙区域内，此时应设为 aria-hidden。",
      })}
    >
      {children}
    </LabArticle>
  );
}
