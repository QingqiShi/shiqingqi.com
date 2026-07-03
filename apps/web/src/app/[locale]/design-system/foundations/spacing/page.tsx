import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SpaceScaleShowcase } from "#src/components/design-system/sections/tokens/space-scale-showcase.tsx";
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
        en: "One rem-based scale of eighteen steps, each drawn to true size as a ruler.",
        zh: "一套以 rem 为基准、共十八级的阶梯，皆按真实尺寸以标尺呈现。",
      })}
    >
      <SpaceScaleShowcase />
    </DocPage>
  );
}
