import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { FilterChipsShowcase } from "#src/design-system/sections/components/filter-chips-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/filter-chips",
  });
}

export default function FilterChipsPage() {
  return (
    <DocPage
      path="/design-system/components/filter-chips"
      description={t({
        en: "One filter of a list as a row of chips, with an optional count each, that scrolls sideways when it is too long.",
        zh: "以一行筛选项为列表选择一个筛选条件，每项可带数字，过长时横向滚动。",
      })}
    >
      <FilterChipsShowcase />
    </DocPage>
  );
}
