import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TabBarShowcase } from "#src/design-system/sections/components/tab-bar-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/tab-bar",
  });
}

export default function TabBarPage() {
  return (
    <DocPage
      path="/design-system/components/tab-bar"
      description={t({
        en: "The top-level destinations of an app in a pill of Glass that floats over the bottom of a small screen: three to five links, each an icon over a short label, all the same width. A press can drag the indicator from one tab to another.",
        zh: "把应用的顶层目标页收进一枚浮在小屏幕底部的玻璃胶囊：三至五个链接，每个都是图标在上、短标签在下，宽度全部相同。按下后可以把指示块从一个标签页拖到另一个。",
      })}
    >
      <TabBarShowcase />
    </DocPage>
  );
}
