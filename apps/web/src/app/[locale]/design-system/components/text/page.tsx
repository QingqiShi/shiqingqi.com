import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { TextShowcase } from "#src/components/design-system/sections/components/text-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/text",
    title: t({ en: "Text", zh: "文本" }),
    description: t({
      en: "The body-copy typography primitive. A four-step type ramp, four tonal roles, and four weights — with the semantic element decoupled from the visual size.",
      zh: "正文排版基础组件。四档字阶、四种色调角色与四种字重——语义元素与视觉字号相互独立。",
    }),
  });
}

export default function TextPage() {
  return (
    <DocPage
      title={t({ en: "Text", zh: "文本" })}
      description={t({
        en: "The body-copy typography primitive. Choose the type step with variant and the colour with tone, then pick the element with as — the semantic tag and the visual size stay decoupled.",
        zh: "正文排版基础组件。用 variant 选择字阶、用 tone 选择颜色，再用 as 选择元素——语义标签与视觉字号保持解耦。",
      })}
    >
      <TextShowcase />
    </DocPage>
  );
}
