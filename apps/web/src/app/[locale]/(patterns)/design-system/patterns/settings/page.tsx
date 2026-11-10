import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { patternMetadata } from "#src/design-system/patterns/pattern-metadata.ts";
import { SettingsScreen } from "#src/design-system/patterns/settings/settings-screen.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return patternMetadata(
    validateLocale(locale),
    "/design-system/patterns/settings",
  );
}

export default function SettingsPatternPage() {
  return <SettingsScreen />;
}
