import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FamiliesShowcase } from "#src/design-system/sections/foundations/families-showcase.tsx";
import { LetterSpacingShowcase } from "#src/design-system/sections/foundations/letter-spacing-showcase.tsx";
import { LineHeightsShowcase } from "#src/design-system/sections/foundations/line-heights-showcase.tsx";
import { TextStylesShowcase } from "#src/design-system/sections/foundations/text-styles-showcase.tsx";
import { TypeScaleShowcase } from "#src/design-system/sections/foundations/type-scale-showcase.tsx";
import { WeightsShowcase } from "#src/design-system/sections/foundations/weights-showcase.tsx";
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
        en: "One family in Inter, shaped by a fluid type scale, weight scale, line-heights, and tracking — then applied through the heading and body text styles.",
        zh: "以 Inter 为单一字体，通过流式字号阶梯、字重阶梯、行高与字距塑形，并应用于标题与正文样式。",
      })}
    >
      <FamiliesShowcase />
      <TypeScaleShowcase />
      <WeightsShowcase />
      <LineHeightsShowcase />
      <LetterSpacingShowcase />
      <TextStylesShowcase />
    </DocPage>
  );
}
