import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { TextareaShowcase } from "#src/components/design-system/sections/components/textarea-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/textarea",
    title: t({ en: "Textarea", zh: "多行文本框" }),
    description: t({
      en: "A multi-line text input sharing the field chrome, with an optional auto-grow mode that expands to fit its content.",
      zh: "多行文本输入框，沿用统一的字段样式，并可选启用随内容自动增高的模式。",
    }),
  });
}

export default function TextareaPage() {
  return (
    <DocPage
      title={t({ en: "Textarea", zh: "多行文本框" })}
      description={t({
        en: "A multi-line text input that shares TextField's label, description, and error chrome. Opt into auto-grow to have it expand with its content, or set a fixed row height the user can resize.",
        zh: "多行文本输入框，与 TextField 共享标签、说明与错误样式。可启用自动增高使其随内容扩展，或设置固定行高供用户手动调整。",
      })}
    >
      <TextareaShowcase />
    </DocPage>
  );
}
