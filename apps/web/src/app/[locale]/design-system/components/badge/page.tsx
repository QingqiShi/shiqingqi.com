import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BadgeShowcase } from "#src/components/design-system/sections/components/badge-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/badge",
  });
}

export default function BadgePage() {
  return (
    <DocPage
      path="/design-system/components/badge"
      description={t({
        en: "Compact status and label indicators. The six Intents plus a bordered default, at two sizes.",
        zh: "紧凑的状态和标签指示器。六种意图色，加一个带边框的默认样式，并支持两种尺寸。",
      })}
    >
      <BadgeShowcase />
    </DocPage>
  );
}
