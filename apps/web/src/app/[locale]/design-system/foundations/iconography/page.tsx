import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { IconographyShowcase } from "#src/design-system/sections/foundations/iconography-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/iconography",
    description: t({
      en: "Where the icons come from, how a slot takes one, how text sizes it, the weight that matches the package, and how to name an icon-only control.",
      zh: "图标从哪里来、插槽如何接收图标、文字如何决定图标大小、与本包一致的字重，以及如何为纯图标控件命名。",
    }),
  });
}

export default function IconographyPage() {
  return (
    <DocPage
      path="/design-system/foundations/iconography"
      description={t({
        en: "@tuja/ui draws its icons with Phosphor and takes yours through icon slots: props such as a Button's icon.",
        zh: "@tuja/ui 用 Phosphor 绘制图标，并通过图标插槽接收你的图标，插槽就是 Button 的 icon 这类属性。",
      })}
    >
      <IconographyShowcase />
    </DocPage>
  );
}
