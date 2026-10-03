import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DustShowcase } from "#src/design-system/sections/foundations/dust-showcase.tsx";
import { EffectLayerShowcase } from "#src/design-system/sections/foundations/effect-layer-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/effect-layer",
    description: t({
      en: "Effects that CSS cannot draw well, drawn with WebGPU on canvas elements behind the page, around the elements that register for them. Experimental.",
      zh: "用 WebGPU 在页面之后的画布元素上，围绕为效果登记的元素，绘制 CSS 难以画好的效果。仍在实验中。",
    }),
  });
}

export default function EffectLayerPage() {
  return (
    <DocPage
      path="/design-system/foundations/effect-layer"
      description={t({
        en: "Effects that CSS cannot draw well, such as particles and light, drawn with WebGPU on <canvas> elements behind the page and around the elements that register for them. This is experimental: Ripple and Dust are the first effects, and the names on this page may change.",
        zh: "用 WebGPU 在页面之后的 <canvas> 元素上、围绕为效果登记的元素，绘制 CSS 难以画好的效果，例如粒子与光线。它仍在实验中：涟漪和尘埃是最先的两个效果，本页的名称也可能改变。",
      })}
    >
      <EffectLayerShowcase />
      <DustShowcase />
    </DocPage>
  );
}
