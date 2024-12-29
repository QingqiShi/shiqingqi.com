export type SupportedLocale = "en" | "zh";
export type SupportedTheme = "light" | "dark" | "system";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}
