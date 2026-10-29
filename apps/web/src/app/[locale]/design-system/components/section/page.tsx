import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SectionShowcase } from "#src/design-system/sections/components/section-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/section",
  });
}

export default function SectionPage() {
  return (
    <DocPage
      path="/design-system/components/section"
      description={t({
        en: "A labelled block of content. The label reads as quiet muted text because at this scale a section title is wayfinding rather than hierarchy — but it is still a real heading, so it can be navigated to.",
        zh: "带标签的内容区块。标签以柔和的弱化文字呈现——在这一层级，区块标题的作用是导航而非层级——但它仍是真实的标题元素，可被跳转访问。",
      })}
    >
      <SectionShowcase />
    </DocPage>
  );
}
