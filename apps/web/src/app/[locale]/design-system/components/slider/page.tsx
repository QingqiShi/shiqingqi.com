import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SliderShowcase } from "#src/components/design-system/sections/components/slider-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/slider",
  });
}

export default function SliderPage() {
  return (
    <DocPage
      path="/design-system/components/slider"
      description={t({
        en: "A single-value range control built on the native input, so keyboard stepping and value announcement come from the platform, with a readout slot for the figure the visitor is choosing.",
        zh: "基于原生 range 输入构建的单值滑块，键盘步进与数值播报都由平台提供，并用 readout 插槽显示访客正在选择的数值。",
      })}
    >
      <SliderShowcase />
    </DocPage>
  );
}
