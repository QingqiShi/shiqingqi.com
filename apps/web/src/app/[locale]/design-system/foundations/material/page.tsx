import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { GlassShowcase } from "#src/design-system/sections/foundations/glass-showcase.tsx";
import { TextureShowcase } from "#src/design-system/sections/foundations/texture-showcase.tsx";
import { WashShowcase } from "#src/design-system/sections/foundations/wash-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/material",
  });
}

export default function MaterialPage() {
  return (
    <DocPage
      path="/design-system/foundations/material"
      description={t({
        en: "Three finishes a surface can take on top of its colour. Glass is for a surface that floats; Wash and Texture give your own still surfaces tone and grain.",
        zh: "表面在颜色之上可以加的三种质感。玻璃用于浮动的表面；淡彩与纹理为你自己的静止表面添上明暗与颗粒。",
      })}
    >
      <GlassShowcase />
      <WashShowcase />
      <TextureShowcase />
    </DocPage>
  );
}
