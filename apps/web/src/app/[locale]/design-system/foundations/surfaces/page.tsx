import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SurfacesFloatingElements } from "#src/design-system/sections/foundations/surfaces-floating-elements.tsx";
import { SurfacesShowcase } from "#src/design-system/sections/foundations/surfaces-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/surfaces",
    description: t({
      en: "The card and popover skins, border widths, the corner Primitive and its radius steps, nested corners, the shadow scale and when components use it, and how floating surfaces blur the page.",
      zh: "卡片与弹出层的现成外观、描边粗细、corner 原语与圆角各级、嵌套圆角、阴影阶梯及组件何时使用它，以及悬浮表面如何虚化页面。",
    }),
  });
}

export default function SurfacesPage() {
  return (
    <DocPage
      path="/design-system/foundations/surfaces"
      description={t({
        en: "A surface is the box that holds content: a card, a panel, a menu. Its edge, its corners and its shadow come from @tuja/ui/tokens.stylex and the corner Primitive. Use the same steps as the components beside it, and your surfaces match theirs.",
        zh: "表面是承载内容的盒子：卡片、面板、菜单。它的边框、圆角与阴影来自 @tuja/ui/tokens.stylex 与 corner 原语。使用与相邻组件相同的步长，你的表面就与它们一致。",
      })}
    >
      <SurfacesShowcase />
      <SurfacesFloatingElements />
    </DocPage>
  );
}
