import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { FamiliesShowcase } from "#src/components/design-system/sections/tokens/families-showcase.tsx";
import { LetterSpacingShowcase } from "#src/components/design-system/sections/tokens/letter-spacing-showcase.tsx";
import { LineHeightsShowcase } from "#src/components/design-system/sections/tokens/line-heights-showcase.tsx";
import { TextStylesShowcase } from "#src/components/design-system/sections/tokens/text-styles-showcase.tsx";
import { TypeScaleShowcase } from "#src/components/design-system/sections/tokens/type-scale-showcase.tsx";
import { WeightsShowcase } from "#src/components/design-system/sections/tokens/weights-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/typography",
    title: t({ en: "Typography", zh: "排版" }),
  });
}

export default function TypographyPage() {
  return (
    <DocPage
      title={t({ en: "Typography", zh: "排版" })}
      description={t({
        en: "One family in Inter, shaped by a fluid type scale, weight ramp, line-heights, and tracking — then applied through the heading and body text styles.",
        zh: "以 Inter 为单一字体，通过流式字号阶梯、字重梯度、行高与字距塑形，并应用于标题与正文样式。",
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
