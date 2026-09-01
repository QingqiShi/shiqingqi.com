import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { ScrollMaskShowcase } from "#src/components/design-system/sections/components/scroll-mask-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
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
    <DocPage
      path="/design-system/components/scroll-mask"
      description={t({
        en: "A scroll region whose content blurs on its way out of view at each edge it can still scroll to, so the region reads as continuing rather than stopping at a line. An edge masks only while there is scrolled-away content past it, so a region resting at its start carries no mask there, and one whose content fits carries none at all.",
        zh: "滚动区域在仍可继续滚动的每条边上，将移出视野的内容渐进虚化，让区域读起来是延续的，而不是在一条线上戛然而止。只有当某条边之外还有已滚过的内容时，该边才会虚化；停在起点的区域在起点一侧没有虚化，内容放得下的区域则完全没有。",
      })}
    >
      <ScrollMaskShowcase />
    </DocPage>
  );
}
