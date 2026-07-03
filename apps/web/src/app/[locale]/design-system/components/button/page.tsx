import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { ButtonShowcase } from "#src/components/design-system/sections/components/button-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/button",
    title: t({ en: "Button", zh: "按钮" }),
  });
}

export default function ButtonPage() {
  return (
    <DocPage
      title={t({ en: "Button", zh: "按钮" })}
      description={t({
        en: "The primary action control, with a tactile press animation. Default, primary, active, and bright variants; optional leading or icon-only content; and a segmented group for related choices.",
        zh: "主要的操作控件，带有富有触感的按压动画。提供默认、主要、激活与明亮风格；支持前置图标或纯图标内容；并可组成用于相关选项的分段按钮组。",
      })}
    >
      <ButtonShowcase />
    </DocPage>
  );
}
