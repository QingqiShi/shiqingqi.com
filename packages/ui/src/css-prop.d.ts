// Global JSX augmentation for the `css` prop. `@stylexjs/babel-plugin`
// (configured with `sxPropName: "css"`) rewrites `css={...}` on host elements
// into `stylex.props(...)` at build time; this declaration is what makes
// `<div css={styles.x} />` type-check. Only `HTMLAttributes`/`SVGAttributes`
// are augmented because the transform only touches lowercase host elements —
// a component takes part by declaring its own `css?: StyleProp` and composing
// it into its root. The declaration lives inside the package so `@tuja/ui`
// type-checks standalone. Consumers get the same augmentation by adding an
// equivalent `css-prop.d.ts` to their own project (see the README) — the
// augmentation must be part of the consumer's TS program, not just ours.
import type { StyleProp } from "./css-prop-types.ts";

declare module "react" {
  // The type parameter must keep React's own name for the declarations to
  // merge, so it cannot take the `_`-prefix unused-var convention.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface HTMLAttributes<T> {
    css?: StyleProp;
  }
  interface SVGAttributes<T> {
    css?: StyleProp;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
