export type SupportedLocale = "en" | "zh";

export interface PageProps {
  params: { locale: SupportedLocale };
  searchParams: { theme: "light" | "dark" | "system" };
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}

export interface Breakpoints {
  sm: "@media (min-width: 320px)";
  md: "@media (min-width: 768px)";
  lg: "@media (min-width: 1080px)";
  xl: "@media (min-width: 2000px)";
}
