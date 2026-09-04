import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { ButtonShowcase } from "#src/components/design-system/sections/components/button-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/button",
  });
}

export default function ButtonPage() {
  return (
    <DocPage
      path="/design-system/components/button"
      description={t({
        en: "The primary action control, with a tactile press animation. Variants step from the default raised surface down through outline and ghost, plus primary and danger for the actions that carry weight; optional leading or icon-only content, and a busy state. For a related set of mutually exclusive choices, reach for SegmentedControl instead.",
        zh: "主要的操作控件，带有富有触感的按压动画。风格从默认的凸起表面依次弱化为描边与无框，另有用于重要操作的主要与危险两种；支持前置图标或纯图标内容，并可显示加载状态。若需要一组互斥的相关选项，请改用 SegmentedControl。",
      })}
    >
      <ButtonShowcase />
    </DocPage>
  );
}
