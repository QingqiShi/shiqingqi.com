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
        en: "The primary action control, with a tactile press animation. Variants step from the default raised surface down through outline and ghost, plus primary and danger for the actions that carry weight; optional leading or icon-only content, a busy state, and a segmented group for related choices.",
        zh: "主要的操作控件，带有富有触感的按压动画。风格从默认的凸起表面依次弱化为描边与无框，另有用于重要操作的主要与危险两种；支持前置图标或纯图标内容、加载状态，并可组成用于相关选项的分段按钮组。",
      })}
    >
      <ButtonShowcase />
    </DocPage>
  );
}
