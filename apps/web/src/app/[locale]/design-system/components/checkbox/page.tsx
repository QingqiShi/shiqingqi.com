import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { CheckboxShowcase } from "#src/design-system/sections/components/checkbox-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/checkbox",
    description: t({
      en: "A labelled checkbox built on a native input, with a tri-state indeterminate dash, description, and inline error.",
      zh: "基于原生 input 的带标签复选框，支持三态的中间横线状态、说明文字与内联错误提示。",
    }),
  });
}

export default function CheckboxPage() {
  return (
    <DocPage path="/design-system/components/checkbox">
      <CheckboxShowcase />
    </DocPage>
  );
}
