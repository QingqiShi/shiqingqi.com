import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BackgroundsShowcase } from "#src/components/design-system/sections/tokens/backgrounds-showcase.tsx";
import { BalanceShowcase } from "#src/components/design-system/sections/tokens/balance-showcase.tsx";
import { ContrastShowcase } from "#src/components/design-system/sections/tokens/contrast-showcase.tsx";
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
        en: "Thirteen hues at twenty-one tones make the system palette. Tokens reference those tones by purpose, and nothing references a tone directly. A token is named for the property it paints, so every token is shown below under that property — backgrounds, then foregrounds, then the six Intents, each with a fill, a border and a foreground of its own — followed by the models and standards the palette is built on.",
        zh: "十三种色相乘以二十一级色调，构成系统调色板。令牌按用途引用这些色调，任何地方都不会直接引用色调。令牌以它所绘制的属性命名，下面便按属性展示全部令牌——先是背景，再是前景色，然后是六种意图色，每一种都有自己的填充、边框与前景色——最后是调色板所依据的模型与标准。",
      })}
    >
      <PaletteShowcase />
      <BackgroundsShowcase />
      <TextRolesShowcase />
      <RolesShowcase />
      <BalanceShowcase />
      <ContrastShowcase />
    </DocPage>
  );
}
