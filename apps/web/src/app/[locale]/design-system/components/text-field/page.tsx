import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { TextFieldShowcase } from "#src/design-system/sections/components/text-field-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/text-field",
    description: t({
      en: "A single-line text input with a built-in label, optional helper text, adornment slots, and an accessible error state.",
      zh: "单行文本输入框，内置标签、可选的说明文字、装饰图标槽位，以及无障碍的错误状态。",
    }),
  });
}

export default function TextFieldPage() {
  return (
    <DocPage path="/design-system/components/text-field">
      <TextFieldShowcase />
    </DocPage>
  );
}
