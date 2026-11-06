import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { StickyControlsShowcase } from "#src/design-system/sections/components/sticky-controls-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/sticky-controls",
    description: t({
      en: "One row of page chrome — a filter bar — parked under the header strip, with the page blurred around its controls while it holds there.",
      zh: "一行页面控件——例如筛选栏——停在页头下方，停住期间页面在其控件周围渐进虚化。",
    }),
  });
}

export default function StickyControlsPage() {
  return (
    <DocPage path="/design-system/components/sticky-controls">
      <StickyControlsShowcase />
    </DocPage>
  );
}
