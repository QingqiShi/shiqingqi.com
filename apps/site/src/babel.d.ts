declare global {
  import type {
    CompiledStyles,
    InlineStyles,
    StyleXArray,
  } from "@stylexjs/stylex/lib/StyleXTypes";

  type StyleProp = StyleXArray<
    null | undefined | boolean | Readonly<[CompiledStyles, InlineStyles]>
  >;

  // Extend React types for native elements
  declare module "react" {
    interface Attributes {
      css?: StyleProp;
    }
  }
}
