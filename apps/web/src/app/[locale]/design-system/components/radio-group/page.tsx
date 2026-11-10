import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { RadioGroupShowcase } from "#src/design-system/sections/components/radio-group-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/radio-group",
  });
}

export default function RadioGroupPage() {
  return (
    <DocPage
      path="/design-system/components/radio-group"
      description={t({
        en: "One answer of a few, each a round mark with a label and an optional line that explains it.",
        zh: "从几个答案中选一个，每个答案是一个圆形标记、一个标签，以及一行可选的说明。",
      })}
    >
      <RadioGroupShowcase />
    </DocPage>
  );
}
