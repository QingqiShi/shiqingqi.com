import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BackgroundsShowcase } from "#src/components/design-system/sections/tokens/backgrounds-showcase.tsx";
import { ColorHierarchy } from "#src/components/design-system/sections/tokens/color-hierarchy.tsx";
import { PaletteShowcase } from "#src/components/design-system/sections/tokens/palette-showcase.tsx";
import { RolesShowcase } from "#src/components/design-system/sections/tokens/roles-showcase.tsx";
import { TextRolesShowcase } from "#src/components/design-system/sections/tokens/text-roles-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/color",
  });
}

export default function ColorPage() {
  return (
    <DocPage
      path="/design-system/foundations/color"
      description={t({
        en: "Thirteen system hues, expanded into perceptually even ramps, then mapped onto background, surface, and text role tokens.",
        zh: "十三种系统色相展开为感知均匀的色调阶梯，再映射到背景、表面与文本角色令牌。",
      })}
    >
      <ColorHierarchy />
      <PaletteShowcase />
      <BackgroundsShowcase />
      <TextRolesShowcase />
      <RolesShowcase />
    </DocPage>
  );
}
