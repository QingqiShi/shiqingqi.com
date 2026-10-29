import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TabViewShowcase } from "#src/design-system/sections/components/tab-view-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/tab-view",
  });
}

export default function TabViewPage() {
  return (
    <DocPage
      path="/design-system/components/tab-view"
      description={t({
        en: "The frame of an app with a few top-level destinations. Declare them once: on a wide screen they stand in a narrow rail, each an icon over a small label; on a small screen they move to a floating tab bar.",
        zh: "适用于只有少数几个顶层目标页的应用框架。目标页只需声明一次：宽屏上它们排在一条窄侧轨中，每个都是图标在上、小标签在下；小屏上它们移到一枚悬浮标签栏中。",
      })}
    >
      <TabViewShowcase />
    </DocPage>
  );
}
