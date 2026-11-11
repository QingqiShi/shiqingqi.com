import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { PageHeaderShowcase } from "#src/design-system/sections/components/page-header-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/page-header",
  });
}

export default function PageHeaderPage() {
  return (
    <DocPage
      path="/design-system/components/page-header"
      description={t({
        en: "The top of a page: its title, a sentence that says what the page is for, and the page's own actions.",
        zh: "页面的顶部：标题、一句说明页面用途的话，以及页面自身的操作。",
      })}
    >
      <PageHeaderShowcase />
    </DocPage>
  );
}
