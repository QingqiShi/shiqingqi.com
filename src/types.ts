import {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/StyleXTypes";

export type SupportedLocale = "en" | "zh";
export type SupportedTheme = "light" | "dark" | "system";

export interface PageProps {
  params: { locale: SupportedLocale };
  searchParams: { theme: SupportedTheme };
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

export type StyleProp = StyleXArray<
  | (null | undefined | CompiledStyles)
  | boolean
  | Readonly<[CompiledStyles, InlineStyles]>
>;
