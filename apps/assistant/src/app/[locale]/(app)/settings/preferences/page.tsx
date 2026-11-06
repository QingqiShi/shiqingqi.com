import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { PreferencesSettings } from "#src/assistant/settings/preferences-settings.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Preferences", zh: "偏好设置" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/settings/preferences");
  return <PreferencesSettings />;
}
