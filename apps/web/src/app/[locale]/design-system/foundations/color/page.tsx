import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ColorIntentsShowcase } from "#src/design-system/sections/foundations/color-intents-showcase.tsx";
import { ColorNamesShowcase } from "#src/design-system/sections/foundations/color-names-showcase.tsx";
import { ColorStartShowcase } from "#src/design-system/sections/foundations/color-start-showcase.tsx";
import { PaletteShowcase } from "#src/design-system/sections/foundations/palette-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/color",
  });
}

export default function ColorPage() {
  return (
    <DocPage
      path="/design-system/foundations/color"
      description={t({
        en: "How @tuja/ui gives colour a meaning, and how to pick the right colour for your own element.",
        zh: "@tuja/ui 如何让颜色有含义，以及如何为你自己的元素选对颜色。",
      })}
    >
      <ColorStartShowcase />
      <ColorNamesShowcase />
      <ColorIntentsShowcase />
      <PaletteShowcase />
    </DocPage>
  );
}
