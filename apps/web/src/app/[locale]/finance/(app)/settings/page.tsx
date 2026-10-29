import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { SettingsSectionView } from "#src/finance/settings/settings-section-view.tsx";

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default function Page() {
  return <SettingsSectionView section="household" />;
}
