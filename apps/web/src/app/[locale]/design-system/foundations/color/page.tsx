import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BackgroundsShowcase } from "#src/components/design-system/sections/tokens/backgrounds-showcase.tsx";
import { PaletteShowcase } from "#src/components/design-system/sections/tokens/palette-showcase.tsx";
import { RolesShowcase } from "#src/components/design-system/sections/tokens/roles-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/color",
    title: t({ en: "Color", zh: "颜色" }),
  });
}

export default function ColorPage() {
  return (
    <DocPage
      title={t({ en: "Color", zh: "颜色" })}
      description={t({
        en: "Thirteen system hues, expanded into perceptually even tonal palettes via Material 3's HCT, then mapped onto semantic background, surface, and text-role tokens.",
        zh: "十三种系统色调通过 Material 3 的 HCT 展开为感知均匀的色调阶梯，再映射到语义化的背景、表面与文本角色令牌。",
      })}
    >
      <PaletteShowcase />
      <BackgroundsShowcase />
      <RolesShowcase />
    </DocPage>
  );
}
