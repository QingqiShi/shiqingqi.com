import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TextShowcase } from "#src/design-system/sections/components/text-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/text",
    description: t({
      en: "The body-copy typography primitive. Five type roles, three tones, and four weights — with the semantic element decoupled from the visual size.",
      zh: "正文文字排版基础组件。五种字体角色、三种色调与四种字重——语义元素与视觉字号相互独立。",
    }),
  });
}

export default function TextPage() {
  return (
    <DocPage path="/design-system/components/text">
      <TextShowcase />
    </DocPage>
  );
}
