import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { AnchorButtonShowcase } from "#src/components/design-system/sections/components/anchor-button-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/anchor-button",
  });
}

export default function AnchorButtonPage() {
  return (
    <DocPage
      path="/design-system/components/anchor-button"
      description={t({
        en: "A destination that carries a Button's weight. It composes Button's own styles, so the two stand the same height at every size and step through the same looks — and it stays a link, with the link role, the new tab and the context menu. A framework link drops into the linkComponent Slot.",
        zh: "一个与按钮同等分量的目标链接。它直接复用 Button 的样式，因此两者在每个尺寸下高度一致、外观阶梯相同——同时它仍然是链接，保留链接角色、新标签页与右键菜单。框架自带的链接组件可以放进 linkComponent 插槽。",
      })}
    >
      <AnchorButtonShowcase />
    </DocPage>
  );
}
