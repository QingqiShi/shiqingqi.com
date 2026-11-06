import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { HeadingShowcase } from "#src/design-system/sections/components/heading-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/heading",
    description: t({
      en: "The heading typography primitive. level sets the semantic rank for the document outline while look sets the visual step — so an h2 can read as a display heading.",
      zh: "标题文字排版基础组件。level 决定文档大纲中的语义层级，look 决定视觉字号——因此 h2 也能以 display 大小呈现。",
    }),
  });
}

export default function HeadingPage() {
  return (
    <DocPage path="/design-system/components/heading">
      <HeadingShowcase />
    </DocPage>
  );
}
