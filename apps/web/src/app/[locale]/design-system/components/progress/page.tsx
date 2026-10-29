import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ProgressShowcase } from "#src/design-system/sections/components/progress-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/progress",
  });
}

export default function ProgressPage() {
  return (
    <DocPage
      path="/design-system/components/progress"
      description={t({
        en: "A determinate meter for work of known length — it reports its value to a screen reader as well as drawing it, and leaves waits with no measurable end to Spinner.",
        zh: "用于长度已知的工作的确定型进度条——它既把数值画出来，也把数值报告给屏幕阅读器；没有明确终点的等待则交给 Spinner。",
      })}
    >
      <ProgressShowcase />
    </DocPage>
  );
}
