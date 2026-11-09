import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { HeaderFooterLayoutShowcase } from "#src/design-system/sections/components/header-footer-layout-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/header-footer-layout",
  });
}

export default function HeaderFooterLayoutPage() {
  return (
    <DocPage path="/design-system/components/header-footer-layout">
      <HeaderFooterLayoutShowcase />
    </DocPage>
  );
}
