import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { PromptFieldShowcase } from "#src/design-system/sections/components/prompt-field-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/prompt-field",
  });
}

export default function PromptFieldPage() {
  return (
    <DocPage
      path="/design-system/components/prompt-field"
      description={t({
        en: "A field for a prompt, with the button that sends it inside the same frame.",
        zh: "用于提问的输入框，发送按钮与文字在同一个边框之内。",
      })}
    >
      <PromptFieldShowcase />
    </DocPage>
  );
}
