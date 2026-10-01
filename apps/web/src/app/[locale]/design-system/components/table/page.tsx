import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TableShowcase } from "#src/design-system/sections/components/table-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/table",
  });
}

export default function TablePage() {
  return (
    <DocPage
      path="/design-system/components/table"
      description={t({
        en: "A static, semantic data table in its own scrolling region — a required caption names it, numeric columns line up digit for digit, and the head can hold at the top while the rows move under it.",
        zh: "位于独立滚动区域内的静态语义化数据表格——必填的 caption 为其命名，数字列逐位对齐，表头还可在各行滚过时保持固定。",
      })}
    >
      <TableShowcase />
    </DocPage>
  );
}
