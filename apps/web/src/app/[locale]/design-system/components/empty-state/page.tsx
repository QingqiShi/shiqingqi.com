import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { EmptyStateShowcase } from "#src/design-system/sections/components/empty-state-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/empty-state",
  });
}

export default function EmptyStatePage() {
  return (
    <DocPage
      path="/design-system/components/empty-state"
      description={t({
        en: "What shows where a list or a card has nothing yet: what is missing, why, and the action that fills it.",
        zh: "列表或卡片还没有内容时显示的内容：缺少什么、为什么，以及填补它的操作。",
      })}
    >
      <EmptyStateShowcase />
    </DocPage>
  );
}
