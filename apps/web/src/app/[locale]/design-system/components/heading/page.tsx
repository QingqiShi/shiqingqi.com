import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { HeadingShowcase } from "#src/components/design-system/sections/components/heading-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/heading",
    title: t({ en: "Heading", zh: "标题" }),
    description: t({
      en: "The heading typography primitive. level sets the semantic rank for the document outline while variant sets the visual ramp — so an h2 can read as a display heading.",
      zh: "标题排版基础组件。level 决定文档大纲中的语义层级，variant 决定视觉字号——因此 h2 也能以 display 大小呈现。",
    }),
  });
}

export default function HeadingPage() {
  return (
    <DocPage
      title={t({ en: "Heading", zh: "标题" })}
      description={t({
        en: "The heading typography primitive. Keep ranks in document order with level, then pick any visual size with variant — the two stay decoupled so the outline never fights the design.",
        zh: "标题排版基础组件。用 level 让层级遵循文档顺序，再用 variant 选择任意视觉字号——二者解耦，让大纲不再与设计冲突。",
      })}
    >
      <HeadingShowcase />
    </DocPage>
  );
}
