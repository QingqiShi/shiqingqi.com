import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { CardShowcase } from "#src/components/design-system/sections/components/card-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/card",
    title: t({ en: "Card", zh: "卡片" }),
  });
}

export default function CardPage() {
  return (
    <DocPage
      title={t({ en: "Card", zh: "卡片" })}
      description={t({
        en: "A bordered surface container. Static by default for panels and alerts; interactive for a clickable tile. When the whole card is a link, compose the surface onto a real anchor.",
        zh: "带描边的表面容器。默认为静态形态，用于面板与提示；可交互形态用于可点击的卡片。当整张卡片为链接时，将该表面组合到真实的锚点元素上。",
      })}
    >
      <CardShowcase />
    </DocPage>
  );
}
