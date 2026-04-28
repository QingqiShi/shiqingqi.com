export type SupportedLocale = "en" | "zh";
export type SupportedTheme = "light" | "dark" | "system";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}
