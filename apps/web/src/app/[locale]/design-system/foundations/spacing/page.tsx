import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SpaceScaleShowcase } from "#src/components/design-system/sections/tokens/space-scale-showcase.tsx";
import { SpaceUsageShowcase } from "#src/components/design-system/sections/tokens/space-usage-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/spacing",
    title: t({ en: "Spacing", zh: "间距" }),
  });
}

export default function SpacingPage() {
  return (
    <DocPage
      title={t({ en: "Spacing", zh: "间距" })}
      description={t({
        en: "One rem-based scale of eighteen steps, drawn as a ruler — then put to work as the padding inside surfaces and the gap between them.",
        zh: "一套以 rem 为基准、共十八级的阶梯，以标尺呈现——再作为表面内部的内边距与表面之间的间距投入使用。",
      })}
    >
      <SpaceScaleShowcase />
      <SpaceUsageShowcase />
    </DocPage>
  );
}
