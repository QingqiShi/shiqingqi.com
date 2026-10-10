import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsSectionView } from "#src/finance/settings/settings-section-view.tsx";
import { isSettingsSection } from "#src/finance/settings/settings-sections.ts";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isSettingsSection(section)) notFound();
  return <SettingsSectionView section={section} />;
}
