import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { AccessibilityShowcase } from "#src/components/design-system/sections/tokens/accessibility-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/accessibility",
    description: t({
      en: "What the components guarantee — names, focus, keyboard models, contrast, reduced motion and live regions — and the four things left to the person using them.",
      zh: "组件所保障的内容——名称、焦点、键盘模型、对比度、减弱动效与实时播报区域——以及留给使用者的四件事。",
    }),
  });
}

export default function AccessibilityPage() {
  return (
    <DocPage
      path="/design-system/foundations/accessibility"
      description={t({
        en: "Not a checklist run at the end. Most of the work is already done by the components — this page says which parts, and what is left to you.",
        zh: "这不是收尾时才跑一遍的检查清单。大部分工作已由组件完成——本页说明是哪些部分，以及什么留给了你。",
      })}
    >
      <AccessibilityShowcase />
    </DocPage>
  );
}
