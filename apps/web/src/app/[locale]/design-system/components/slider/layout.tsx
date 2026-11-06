import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { LabArticle } from "#src/design-system/lab/lab-page.tsx";

export default function SliderLayout({ children }: { children: ReactNode }) {
  return (
    <LabArticle
      path="/design-system/components/slider"
      description={t({
        en: "A single-value range control built on the native input, so keyboard stepping and value announcement come from the platform, with a readout slot for the figure the visitor is choosing.",
        zh: "基于原生 range 输入构建的单值滑块，键盘步进与数值播报都由平台提供，并用 readout 插槽显示访客正在选择的数值。",
      })}
    >
      {children}
    </LabArticle>
  );
}
