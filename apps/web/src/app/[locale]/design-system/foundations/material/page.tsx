import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { BlurShowcase } from "#src/design-system/sections/foundations/blur-showcase.tsx";
import { GlassShowcase } from "#src/design-system/sections/foundations/glass-showcase.tsx";
import { TextureShowcase } from "#src/design-system/sections/foundations/texture-showcase.tsx";
import { WashShowcase } from "#src/design-system/sections/foundations/wash-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
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
        en: "How a surface takes on a look beyond its colour and border: a texture drawn across it, a wash that gives it volume, and glass that catches light. Nothing else on the page is lit, and nothing else casts a shadow.",
        zh: "表面在颜色与边框之外的质感：绘制其上的纹理、赋予体量的淡彩，以及捕捉光线的玻璃。页面上没有别的东西被照亮，也没有别的东西投下阴影。",
      })}
    >
      <TextureShowcase />
      <WashShowcase />
      <GlassShowcase />
      <BlurShowcase />
    </DocPage>
  );
}
