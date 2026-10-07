import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { BadgeShowcase } from "#src/design-system/sections/components/badge-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/badge",
  });
}

export default function BadgePage() {
  return (
    <DocPage path="/design-system/components/badge">
      <BadgeShowcase />
    </DocPage>
  );
}
