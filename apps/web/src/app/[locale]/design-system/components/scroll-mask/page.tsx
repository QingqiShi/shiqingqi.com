import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ScrollMaskShowcase } from "#src/design-system/sections/components/scroll-mask-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/scroll-mask",
    description: t({
      en: "The progressive blur at the edge of a scroll region: content blurs on its way out of view rather than stopping at a line. Vertical or horizontal, with the radius and the depth set per region.",
      zh: "滚动区域边缘的渐进虚化：内容在移出视野时逐渐虚化，而不是在一条线上戛然而止。支持纵向与横向，虚化半径与深度按区域设定。",
    }),
  });
}

export default function ScrollMaskPage() {
  return (
    <DocPage path="/design-system/components/scroll-mask">
      <ScrollMaskShowcase />
    </DocPage>
  );
}
