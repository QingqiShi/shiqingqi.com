// Global JSX augmentation for the `css` prop. `@stylexjs/babel-plugin`
// (configured with `sxPropName: "css"`) rewrites `css={...}` on host elements
// into `stylex.props(...)` at build time; this declaration is what makes
// `<div css={styles.x} />` type-check. Only `HTMLAttributes`/`SVGAttributes`
// are augmented because the transform only touches lowercase host elements —
// a component takes part by declaring its own `css?: StyleProp` and composing
// it into its root. It reuses the exact `StyleProp` type that `@tuja/ui`
// components declare for their own `css` prop, so the app's host-element `css`
// and the component `css` prop share one contract.
import type { StyleProp } from "@tuja/ui/css-prop-types";

declare module "react" {
  // The type parameter must keep React's own name for the declarations to
  // merge, so it cannot take the `_`-prefix unused-var convention.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TS2428: augmentation must repeat the original type parameters verbatim
  interface HTMLAttributes<T> {
    css?: StyleProp;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TS2428: augmentation must repeat the original type parameters verbatim
  interface SVGAttributes<T> {
    css?: StyleProp;
  }
}
