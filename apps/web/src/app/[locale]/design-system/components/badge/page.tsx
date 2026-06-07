import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BadgeShowcase } from "#src/components/design-system/sections/components/badge-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/badge",
    title: t({ en: "Badge", zh: "徽章" }),
  });
}

export default function BadgePage() {
  return (
    <DocPage
      title={t({ en: "Badge", zh: "徽章" })}
      description={t({
        en: "Compact status and label indicators. Six tones for different signals — neutral, accent, and four semantic — at two sizes.",
        zh: "紧凑的状态和标签指示器。提供六种色调以传达不同信号——中性、强调与四种语义色——并支持两种尺寸。",
      })}
    >
      <BadgeShowcase />
    </DocPage>
  );
}
