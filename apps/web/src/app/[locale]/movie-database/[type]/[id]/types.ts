import type { SupportedLocale } from "@tuja/i18n/types";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale; type: string; id: string }>;
}
