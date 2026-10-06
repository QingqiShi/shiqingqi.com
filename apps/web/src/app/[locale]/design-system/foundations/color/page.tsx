import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { BackgroundsShowcase } from "#src/design-system/sections/foundations/backgrounds-showcase.tsx";
import { ColorBordersShowcase } from "#src/design-system/sections/foundations/color-borders-showcase.tsx";
import { ColorJobsShowcase } from "#src/design-system/sections/foundations/color-jobs-showcase.tsx";
import { ColorStartShowcase } from "#src/design-system/sections/foundations/color-start-showcase.tsx";
import { ContrastShowcase } from "#src/design-system/sections/foundations/contrast-showcase.tsx";
import { PaletteShowcase } from "#src/design-system/sections/foundations/palette-showcase.tsx";
import { RolesShowcase } from "#src/design-system/sections/foundations/roles-showcase.tsx";
import { TextRolesShowcase } from "#src/design-system/sections/foundations/text-roles-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
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
        en: "Which colour token to use when you build your own element, which Intent fits a job, which pairings keep their contrast, and where to get a colour no token covers.",
        zh: "自行构建元素时该用哪个颜色令牌、哪种意图色适合哪种用途、哪些搭配能保持对比度，以及令牌未涵盖的颜色从哪里取。",
      })}
    >
      <ColorStartShowcase />
      <ColorJobsShowcase />
      <BackgroundsShowcase />
      <TextRolesShowcase />
      <ColorBordersShowcase />
      <RolesShowcase />
      <ContrastShowcase />
      <PaletteShowcase />
    </DocPage>
  );
}
