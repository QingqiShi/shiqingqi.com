// Global JSX augmentation for the `css` prop. `@tuja/babel-plugin-stylex-css-prop`
// rewrites `css={...}` into `stylex.props(...)` at build time; this declaration
// is what makes `<div css={styles.x} />` type-check. It lives inside the package
// so `@tuja/ui` type-checks standalone. Consumers get the same augmentation by
// adding an equivalent `css-prop.d.ts` to their own project (see the README) —
// the augmentation must be part of the consumer's TS program, not just ours.
import type {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/types/StyleXTypes";

type StyleProp = StyleXArray<
  null | undefined | boolean | Readonly<[CompiledStyles, InlineStyles]>
>;

declare module "react" {
  interface Attributes {
    css?: StyleProp;
  }
}
