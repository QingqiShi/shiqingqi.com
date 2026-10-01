import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ProgressiveBlurShowcase } from "#src/design-system/sections/components/progressive-blur-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/progressive-blur",
  });
}

export default function ProgressiveBlurPage() {
  return (
    <DocPage
      path="/design-system/components/progressive-blur"
      description={t({
        en: "The page blurred around whatever floats, in place of dimming it — strongest nearest the element, easing back to sharp further out. The radius is set per element, within a cap, and the blur can melt away and back.",
        zh: "在悬浮元素周围将页面渐进虚化，以取代压暗——越靠近元素越模糊，越远处越清晰。虚化半径按元素设定且有上限，虚化还可平滑地消失与恢复。",
      })}
    >
      <ProgressiveBlurShowcase />
    </DocPage>
  );
}
