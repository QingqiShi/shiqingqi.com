import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { BlackHoleShowcase } from "#src/design-system/sections/effect-layer/black-hole-showcase.tsx";
import { DustShowcase } from "#src/design-system/sections/effect-layer/dust-showcase.tsx";
import { EffectContainerShowcase } from "#src/design-system/sections/effect-layer/effect-container-showcase.tsx";
import { EffectLayerRipple } from "#src/design-system/sections/effect-layer/effect-layer-ripple.tsx";
import { EffectLayerShowcase } from "#src/design-system/sections/effect-layer/effect-layer-showcase.tsx";
import { EffectLayerTestBenches } from "#src/design-system/sections/effect-layer/effect-layer-test-benches.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/effect-layer",
    description: t({
      en: "Set up EffectLayerProvider, register elements, and draw effects that CSS cannot draw well — Ripple, Dust and Black hole — with WebGPU over the page. Experimental.",
      zh: "设置 EffectLayerProvider、登记元素，并用 WebGPU 在页面之上绘制 CSS 难以画好的效果——涟漪、灰尘与黑洞。仍在实验中。",
    }),
  });
}

export default function EffectLayerPage() {
  return (
    <DocPage
      path="/design-system/effect-layer"
      description={t({
        en: "Effects that CSS cannot draw well, such as particles and light, drawn with WebGPU on <canvas> elements over the page and around the elements that register for them. This is experimental: Ripple, Dust and Black hole are the first effects, and the names on this page may change.",
        zh: "用 WebGPU 在页面之上的 <canvas> 元素上、围绕为效果登记的元素，绘制 CSS 难以画好的效果，例如粒子与光线。它仍在实验中：涟漪、灰尘和黑洞是最先的几个效果，本页的名称也可能改变。",
      })}
    >
      <EffectLayerShowcase />
      <EffectLayerRipple />
      <DustShowcase />
      <BlackHoleShowcase />
      <EffectContainerShowcase />
      <EffectLayerTestBenches />
    </DocPage>
  );
}
