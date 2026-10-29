import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { ReactNode } from "react";
import { SettingsFrame } from "#src/finance/settings/settings-frame.tsx";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // A layout can render before the root layout sets the locale, so it sets it too.
  setLocale(validateLocale((await params).locale));
  return <SettingsFrame>{children}</SettingsFrame>;
}
