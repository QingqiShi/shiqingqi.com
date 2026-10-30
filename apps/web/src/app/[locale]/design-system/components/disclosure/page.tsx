import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DisclosureShowcase } from "#src/design-system/sections/components/disclosure-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/disclosure",
  });
}

export default function DisclosurePage() {
  return (
    <DocPage
      path="/design-system/components/disclosure"
      description={t({
        en: "A header row that reveals a panel beneath it. The component covers the case where the whole header is the trigger; the useDisclosure hook underneath covers the rest, keeping the same ARIA wiring.",
        zh: "点击标题行展开下方面板。当整个标题行即触发器时使用该组件；其余情形可使用底层的useDisclosure钩子，两者共享同一套ARIA关联。",
      })}
    >
      <DisclosureShowcase />
    </DocPage>
  );
}
