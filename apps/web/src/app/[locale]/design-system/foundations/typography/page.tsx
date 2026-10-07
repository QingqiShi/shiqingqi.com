import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FamiliesShowcase } from "#src/design-system/sections/foundations/families-showcase.tsx";
import { TypeRolesShowcase } from "#src/design-system/sections/foundations/type-roles-showcase.tsx";
import { TypographyReferenceShowcase } from "#src/design-system/sections/foundations/typography-reference-showcase.tsx";
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
        en: "Most text needs only Text and Heading. When you style text yourself, compose a type role, which sets the size, line height, weight and tracking together. This page lists the type roles, the two families, and the tokens a style may change on top of a type role.",
        zh: "大多数文字只需要 Text 与 Heading。当你自己为文字设置样式时，请组合一个字体角色，它会同时设定字号、行高、字重与字距。本页列出所有字体角色、两种字体族，以及在字体角色之上样式可以改动的令牌。",
      })}
    >
      <TypographyStartShowcase />
      <TypeRolesShowcase />
      <FamiliesShowcase />
      <TypographyReferenceShowcase />
    </DocPage>
  );
}
