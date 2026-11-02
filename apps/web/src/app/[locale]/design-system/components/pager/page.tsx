import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { PagerShowcase } from "#src/design-system/sections/components/pager-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/pager",
  });
}

export default function PagerPage() {
  return (
    <DocPage
      path="/design-system/components/pager"
      description={t({
        en: "The previous and next links at the end of a page in a sequence, so a reader can go on without a trip back to the menu.",
        zh: "连续页面末尾的上一页与下一页链接，读者不必回到菜单就能继续读下去。",
      })}
    >
      <PagerShowcase />
    </DocPage>
  );
}
