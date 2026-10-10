import type { SupportedLocale } from "#src/i18n/types.ts";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale; type: string; id: string }>;
}
