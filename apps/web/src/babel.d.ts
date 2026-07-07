// Global JSX augmentation for the `css` prop. `@tuja/babel-plugin-stylex-css-prop`
// rewrites `css={...}` into `stylex.props(...)` at build time; this declaration is
// what makes `<div css={styles.x} />` type-check. It reuses the exact `StyleProp`
// type that `@tuja/ui` components declare for their own `css` prop, so the app's
// intrinsic-element `css` and the component `css` prop share one contract.
import type { StyleProp } from "@tuja/ui/css-prop-types";

declare module "react" {
  interface Attributes {
    css?: StyleProp;
  }
}
