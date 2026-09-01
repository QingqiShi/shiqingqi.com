import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { HeaderFooterLayoutShowcase } from "#src/components/design-system/sections/components/header-footer-layout-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/header-footer-layout",
    description: t({
      en: "A reading-density page shell with floating header controls and an optional footer. The header's start and end groups align to the same readable column as the content — built for information and reading surfaces.",
      zh: "带悬浮页头控件与可选页脚的阅读密度页面骨架。页头的起始与结尾控件组与内容对齐到同一可读列——为信息与阅读型页面而设计。",
    }),
  });
}

export default function HeaderFooterLayoutPage() {
  return (
    <DocPage
      path="/design-system/components/header-footer-layout"
      description={t({
        en: "A reading-density shell for information surfaces. Supply the header's start and end groups and an optional footer; the shell owns the floating controls, the readable centred column, and the breathing room around it.",
        zh: "面向信息型页面的阅读密度骨架。提供页头的起始与结尾控件组以及可选页脚即可；骨架负责悬浮控件、可读的居中内容列及其周围的留白。",
      })}
    >
      <HeaderFooterLayoutShowcase />
    </DocPage>
  );
}
