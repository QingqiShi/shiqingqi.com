import type { Metadata } from "next";
import { SettingsSectionView } from "#src/finance/settings/settings-section-view.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default function Page() {
  return <SettingsSectionView section="household" />;
}
