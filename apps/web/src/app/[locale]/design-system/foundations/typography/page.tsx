import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FamiliesShowcase } from "#src/design-system/sections/foundations/families-showcase.tsx";
import { TypeScaleShowcase } from "#src/design-system/sections/foundations/type-scale-showcase.tsx";
import {
  TypographyPairingShowcase,
  TypographyReferenceShowcase,
} from "#src/design-system/sections/foundations/typography-reference-showcase.tsx";
import { TypographyStartShowcase } from "#src/design-system/sections/foundations/typography-start-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/typography",
  });
}

export default function TypographyPage() {
  return (
    <DocPage
      path="/design-system/foundations/typography"
      description={t({
        en: "Most text needs only Text and Heading. When you style text yourself, this page says which font family and size scale to use, and which line height, weight and tracking go with each size.",
        zh: "大多数文字只需要 Text 与 Heading。当你自己为文字设置样式时，本页说明该用哪种字体族与哪套字阶，以及每种字号搭配哪种行高、字重与字距。",
      })}
    >
      <TypographyStartShowcase />
      <FamiliesShowcase />
      <TypeScaleShowcase />
      <TypographyPairingShowcase />
      <TypographyReferenceShowcase />
    </DocPage>
  );
}
