import type { SupportedLocale } from "#src/types.ts";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale; type: string; id: string }>;
}
