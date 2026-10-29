import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { CardShowcase } from "#src/design-system/sections/components/card-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/card",
  });
}

export default function CardPage() {
  return (
    <DocPage
      path="/design-system/components/card"
      description={t({
        en: "A bordered surface container. Static by default for panels and alerts; interactive for a clickable tile. When the whole card is a link, compose the surface onto a real anchor.",
        zh: "带描边的表面容器。默认为静态形态，用于面板与提示；可交互形态用于可点击的卡片。当整张卡片为链接时，将该表面组合到真实的锚点元素上。",
      })}
    >
      <CardShowcase />
    </DocPage>
  );
}
