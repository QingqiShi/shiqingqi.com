import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { IconographyShowcase } from "#src/design-system/sections/foundations/iconography-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/iconography",
    description: t({
      en: "Adding Phosphor beside @tuja/ui, the icon slots components take, sizing and colouring from the parent, and which weight matches the package.",
      zh: "在 @tuja/ui 旁加入 Phosphor、组件提供的图标插槽、由父元素决定尺寸与颜色，以及与本包一致的字重。",
    }),
  });
}

export default function IconographyPage() {
  return (
    <DocPage
      path="/design-system/foundations/iconography"
      description={t({
        en: "The components draw their icons with Phosphor and take yours through icon slots. This page covers installing it, what a slot does with your icon, and the weight that matches the package's own.",
        zh: "组件用 Phosphor 绘制自带图标，并通过图标插槽接收你的图标。本页介绍如何安装、插槽会如何处理你的图标，以及与本包自带图标一致的字重。",
      })}
    >
      <IconographyShowcase />
    </DocPage>
  );
}
