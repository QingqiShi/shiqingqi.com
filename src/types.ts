import type {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/StyleXTypes";

export type SupportedLocale = "en" | "zh";
export type SupportedTheme = "light" | "dark" | "system";

export interface PageProps {
  params: { locale: SupportedLocale };
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}

export interface Breakpoints {
  minSm: "@media (min-width: 320px)";
  maxSm: "@media (max-width: 767px)";
  minMd: "@media (min-width: 768px)";
  maxMd: "@media (max-width: 1079px)";
  minLg: "@media (min-width: 1080px)";
  maxLg: "@media (max-width: 1999px)";
  minXl: "@media (min-width: 2000px)";
  sm: "@media (min-width: 320px) and (max-width: 767px)";
  md: "@media (min-width: 768px) and (max-width: 1079px)";
  lg: "@media (min-width: 1080px) and (max-width: 1999px)";
}

export type StyleProp = StyleXArray<
  | (null | undefined | CompiledStyles)
  | boolean
  | Readonly<[CompiledStyles, InlineStyles]>
>;
