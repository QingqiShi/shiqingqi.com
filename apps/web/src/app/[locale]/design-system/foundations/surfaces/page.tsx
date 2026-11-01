import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SurfacesFloatingElements } from "#src/design-system/sections/foundations/surfaces-floating-elements.tsx";
import { SurfacesShowcase } from "#src/design-system/sections/foundations/surfaces-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/surfaces",
    description: t({
      en: "How a surface in @tuja/ui takes its skin, its corner and its shadow, and how a floating surface sets itself apart from the page.",
      zh: "@tuja/ui 中的表面如何选用外观、圆角与阴影，以及悬浮的表面如何与页面区分开来。",
    }),
  });
}

export default function SurfacesPage() {
  return (
    <DocPage
      path="/design-system/foundations/surfaces"
      description={t({
        en: "A surface is the box that holds content: a card, a panel, a menu. Take the same steps as the components beside it, and your surface matches them.",
        zh: "表面是承载内容的盒子：卡片、面板、菜单。选用与相邻组件相同的级别，你的表面就与它们一致。",
      })}
    >
      <SurfacesShowcase />
      <SurfacesFloatingElements />
    </DocPage>
  );
}
