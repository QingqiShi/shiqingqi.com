import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DividerShowcase } from "#src/design-system/sections/components/divider-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/divider",
  });
}

export default function DividerPage() {
  return (
    <DocPage
      path="/design-system/components/divider"
      description={t({
        en: "Visual separators for content. Subtle for in-flow breaks, bold for stronger separation, decorative for accent moments.",
        zh: "用于分隔内容的视觉元素。柔和用于自然分段，强烈用于明显分隔，装饰用于点缀重点。",
      })}
    >
      <DividerShowcase />
    </DocPage>
  );
}
