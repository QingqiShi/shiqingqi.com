import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ColumnsShowcase } from "#src/design-system/sections/components/columns-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/columns",
  });
}

export default function ColumnsPage() {
  return (
    <DocPage
      path="/design-system/components/columns"
      description={t({
        en: "Page content in columns side by side, shared by a ratio, that stack into one where their box is narrow.",
        zh: "并排的多列页面内容，按比例分配宽度，在容器变窄时堆叠成一列。",
      })}
    >
      <ColumnsShowcase />
    </DocPage>
  );
}
