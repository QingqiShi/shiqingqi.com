import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TextShowcase } from "#src/design-system/sections/components/text-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
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
    <DocPage
      path="/design-system/components/text"
      description={t({
        en: "The body-copy typography primitive. Choose the type role with look and the colour with tone, then pick the element with as — the semantic tag and the visual size stay decoupled.",
        zh: "正文文字排版基础组件。用 look 选择字体角色、用 tone 选择颜色，再用 as 选择元素——语义标签与视觉字号保持解耦。",
      })}
    >
      <TextShowcase />
    </DocPage>
  );
}
