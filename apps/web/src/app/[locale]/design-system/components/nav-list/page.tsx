import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { NavListShowcase } from "#src/design-system/sections/components/nav-list-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/nav-list",
  });
}

export default function NavListPage() {
  return (
    <DocPage
      path="/design-system/components/nav-list"
      description={t({
        en: "The links that move between the pages of one place, in one column: each link pads itself, the rows take no gap, and groups with a label set the larger steps.",
        zh: "在同一处的各页面之间切换的链接，排成一列：每个链接自带内边距，行间不留间距，带标签的分组设定更大的间距。",
      })}
    >
      <NavListShowcase />
    </DocPage>
  );
}
