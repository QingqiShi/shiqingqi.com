import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { StatShowcase } from "#src/design-system/sections/components/stat-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/stat",
  });
}

export default function StatPage() {
  return (
    <DocPage
      path="/design-system/components/stat"
      description={t({
        en: "The few key figures a page is about, each with a label and a line of context, in a row that fits its width.",
        zh: "页面所关注的几个关键数字，各带标签与一行背景说明，排成一行并适应自身宽度。",
      })}
    >
      <StatShowcase />
    </DocPage>
  );
}
