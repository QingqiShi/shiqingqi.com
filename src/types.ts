import type {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/StyleXTypes";

export type SupportedLocale = "en" | "zh";
export type SupportedTheme = "light" | "dark" | "system";

export interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export interface LayoutProps extends Pick<PageProps, "params"> {
  children: React.ReactNode;
}

export type StyleProp = StyleXArray<
  | (null | undefined | CompiledStyles)
  | boolean
  | Readonly<[CompiledStyles, InlineStyles]>
>;
