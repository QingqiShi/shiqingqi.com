import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { GlassShowcase } from "#src/design-system/sections/foundations/glass-showcase.tsx";
import { MaterialGuide } from "#src/design-system/sections/foundations/material-guide.tsx";
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
        en: "Three treatments you can add to a surface on top of its colour and border: a texture of faint dots, a wash that fades one tone across it, and glass that blurs what is behind it. Each is a style object with Tokens you set per surface.",
        zh: "三种可以在颜色与边框之上加给表面的处理：淡点组成的纹理、让一种色调在表面上渐隐的淡彩，以及虚化背后内容的玻璃。每一种都是一个样式对象，带有可按表面设定的令牌。",
      })}
    >
      <MaterialGuide />
      <TextureShowcase />
      <WashShowcase />
      <GlassShowcase />
    </DocPage>
  );
}
