import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SettingRowShowcase } from "#src/design-system/sections/components/setting-row-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/setting-row",
  });
}

export default function SettingRowPage() {
  return (
    <DocPage
      path="/design-system/components/setting-row"
      description={t({
        en: "One setting per row: its name and what it changes at the start, the control that changes it at the end, and what depends on it underneath.",
        zh: "每行一个设置：名称及其作用在行首，改变它的控件在行尾，依赖于它的内容在下方。",
      })}
    >
      <SettingRowShowcase />
    </DocPage>
  );
}
