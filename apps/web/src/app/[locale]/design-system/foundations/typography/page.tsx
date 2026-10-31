import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FamiliesShowcase } from "#src/design-system/sections/foundations/families-showcase.tsx";
import { TypeRolesShowcase } from "#src/design-system/sections/foundations/type-roles-showcase.tsx";
import { TypographyFluidShowcase } from "#src/design-system/sections/foundations/typography-fluid-showcase.tsx";
import { TypographyStartShowcase } from "#src/design-system/sections/foundations/typography-start-showcase.tsx";
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
        en: "Text takes its size from a type role, named for the job of the text.",
        zh: "文字的字号来自字体角色，角色以文字的用途命名。",
      })}
    >
      <TypeRolesShowcase />
      <TypographyStartShowcase />
      <TypographyFluidShowcase />
      <FamiliesShowcase />
    </DocPage>
  );
}
