import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SegmentedControlShowcase } from "#src/components/design-system/sections/components/segmented-control-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/segmented-control",
  });
}

export default function SegmentedControlPage() {
  return (
    <DocPage
      path="/design-system/components/segmented-control"
      description={t({
        en: "A single-select track whose options are all visible at once. Use it for two to four mutually exclusive views of the same content; a longer or open-ended list belongs in a Select.",
        zh: "所有选项同时可见的单选轨道。适用于同一内容的二至四种互斥视图；更长或开放式的选项列表应使用下拉选择。",
      })}
    >
      <SegmentedControlShowcase />
    </DocPage>
  );
}
