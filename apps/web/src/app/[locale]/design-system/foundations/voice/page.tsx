import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { VoiceShowcase } from "#src/components/design-system/sections/tokens/voice-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/voice",
    description: t({
      en: "Four qualities to hold a sentence against, how much copy each component can carry, and the words that don't ship.",
      zh: "可用来检验每句话的四条品质、每个组件能承载多少文案，以及那些不该出现的词。",
    }),
  });
}

export default function VoicePage() {
  return (
    <DocPage
      path="/design-system/foundations/voice"
      description={t({
        en: "The words are part of the component. A button whose label doesn't say what happens is a broken button, and no amount of styling repairs it. This is the standard the copy is held to.",
        zh: "文案是组件的一部分。按钮的标签若没有说明会发生什么，这个按钮就是坏的，再多样式也修不好。本页就是文案所要遵守的那套标准。",
      })}
    >
      <VoiceShowcase />
    </DocPage>
  );
}
