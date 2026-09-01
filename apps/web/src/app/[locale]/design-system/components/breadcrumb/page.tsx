import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BreadcrumbShowcase } from "#src/components/design-system/sections/components/breadcrumb-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/breadcrumb",
  });
}

export default function BreadcrumbPage() {
  return (
    <DocPage
      path="/design-system/components/breadcrumb"
      description={t({
        en: "The trail of ancestor pages above the current one: a named nav landmark, a link to every level that has a page, and the current page rendered as text rather than as a link to itself.",
        zh: "当前页面之上的上级路径：一个具名的 nav 地标、指向每个有页面的层级的链接，而当前页面渲染为文本，而非指向自身的链接。",
      })}
    >
      <BreadcrumbShowcase />
    </DocPage>
  );
}
