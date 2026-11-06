import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SpinnerShowcase } from "#src/design-system/sections/components/spinner-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/spinner",
    description: t({
      en: "An indeterminate loading indicator in three rem-scaled sizes and two tones. It requires either a label or aria-hidden, and swaps its rotation for a gentle opacity pulse under reduced-motion.",
      zh: "不确定型加载指示器，提供三种按 rem 缩放的尺寸与两种色调。它要求提供 label 或 aria-hidden，并在减弱动态时以柔和的透明度脉动取代旋转。",
    }),
  });
}

export default function SpinnerPage() {
  return (
    <DocPage path="/design-system/components/spinner">
      <SpinnerShowcase />
    </DocPage>
  );
}
