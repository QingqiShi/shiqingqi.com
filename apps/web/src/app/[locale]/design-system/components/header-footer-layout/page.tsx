import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { HeaderFooterLayoutShowcase } from "#src/design-system/sections/components/header-footer-layout-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/header-footer-layout",
    description: t({
      en: "A page shell for reading, with floating header controls and an optional footer. The header's start and end groups align to the same readable column as the content.",
      zh: "面向阅读的页面骨架，带悬浮页头控件与可选页脚。页头的起始与结尾控件组与内容对齐到同一可读列。",
    }),
  });
}

export default function HeaderFooterLayoutPage() {
  return (
    <DocPage path="/design-system/components/header-footer-layout">
      <HeaderFooterLayoutShowcase />
    </DocPage>
  );
}
