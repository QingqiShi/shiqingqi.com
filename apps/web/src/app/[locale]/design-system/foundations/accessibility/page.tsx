import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { AccessibilityShowcase } from "#src/design-system/sections/foundations/accessibility-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/accessibility",
  });
}

export default function AccessibilityPage() {
  return (
    <DocPage
      path="/design-system/foundations/accessibility"
      description={
        <>
          {t({
            en: "The components handle focus, touch and announcements, and follow reduced motion (see ",
            zh: "组件负责焦点、触摸与状态播报，并遵循减弱动效（见",
          })}
          <DocLink path="/design-system/foundations/motion" />
          {t({
            en: "). Every word they show or say comes from you.",
            zh: "）。它们显示或朗读的每个词都来自你。",
          })}
        </>
      }
    >
      <AccessibilityShowcase />
    </DocPage>
  );
}
