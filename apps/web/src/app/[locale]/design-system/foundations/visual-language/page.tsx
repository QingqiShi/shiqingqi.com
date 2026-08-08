import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { VisualLanguageBrandShowcase } from "#src/components/design-system/sections/tokens/visual-language-brand-showcase.tsx";
import { VisualLanguageMotionShowcase } from "#src/components/design-system/sections/tokens/visual-language-motion-showcase.tsx";
import { VisualLanguageShowcase } from "#src/components/design-system/sections/tokens/visual-language-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/visual-language",
  });
}

export default function VisualLanguagePage() {
  return (
    <DocPage
      path="/design-system/foundations/visual-language"
      description={t({
        en: "A working preview of the visual language DESIGN.md sets out: surfaces, nested radii, the measure a script disagrees on, texture, wash, progressive blur, spring motion, and what a brand is allowed to move.",
        zh: "DESIGN.md 所定视觉语言的实景预览：表面、嵌套圆角、脚本各异的行长、纹理、淡彩、渐进虚化、弹簧动效，以及品牌可调整的范围。",
      })}
    >
      <VisualLanguageShowcase />
      <VisualLanguageMotionShowcase />
      <VisualLanguageBrandShowcase />
    </DocPage>
  );
}
