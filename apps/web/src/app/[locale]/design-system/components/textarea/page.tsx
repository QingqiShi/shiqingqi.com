import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TextareaShowcase } from "#src/design-system/sections/components/textarea-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/textarea",
    description: t({
      en: "A multi-line text input sharing the field chrome, with an optional auto-grow mode that expands to fit its content.",
      zh: "多行文本输入框，沿用统一的字段样式，并可选启用随内容自动增高的模式。",
    }),
  });
}

export default function TextareaPage() {
  return (
    <DocPage path="/design-system/components/textarea">
      <TextareaShowcase />
    </DocPage>
  );
}
