import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { DisclosureShowcase } from "#src/components/design-system/sections/components/disclosure-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
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
        zh: "点击标题行展开下方面板。当整个标题行即触发器时使用该组件；其余情形可使用底层的 useDisclosure 钩子，两者共享同一套 ARIA 关联。",
      })}
    >
      <DisclosureShowcase />
    </DocPage>
  );
}
