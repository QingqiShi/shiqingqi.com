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
  });
}

export default function IconographyPage() {
  return (
    <DocPage
      path="/design-system/foundations/iconography"
      description={t({
        en: "@tuja/ui draws its icons with Phosphor and takes yours through icon slots: props such as a Button's icon.",
        zh: "@tuja/ui 用 Phosphor 绘制图标，并通过图标插槽接收你的图标，插槽就是 Button 的 icon 这类 prop。",
      })}
    >
      <IconographyShowcase />
    </DocPage>
  );
}
