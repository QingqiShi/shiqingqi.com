export type SupportedLocale = "en" | "zh";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}
