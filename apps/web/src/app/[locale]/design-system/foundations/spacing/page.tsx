import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { ControlSizeShowcase } from "#src/components/design-system/sections/tokens/control-size-showcase.tsx";
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
        en: "The rem-based spacing scale — eighteen steps drawn to true size as a ruler — and the responsive control-size ramp that sets the dimensions of every interactive control.",
        zh: "以 rem 为基准的间距阶梯——十八级按真实尺寸如标尺般呈现——以及决定每个交互控件尺寸的响应式控件尺寸阶梯。",
      })}
    >
      <SpaceScaleShowcase />
      <ControlSizeShowcase />
    </DocPage>
  );
}
