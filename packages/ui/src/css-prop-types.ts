import type {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/types/StyleXTypes";

/**
 * The type of the custom `css` prop. It mirrors the argument type of
 * `stylex.props()` — which `@stylexjs/babel-plugin` (configured with
 * `sxPropName: "css"`) rewrites `css={...}` into at build time on host
 * elements — so the union must include a bare `CompiledStyles` object (a
 * plain `stylex.create` output), not only the `[CompiledStyles,
 * InlineStyles]` tuple.
 *
 * Components declare their own `css` prop with this same type so that the
 * component-level `css` and the ambient intrinsic-element `css` share one
 * contract; typing components with the stricter authoring type `StyleXStyles`
 * instead makes the two intersect and rejects composed `css={[...]}` arrays.
 */
export type StyleProp = StyleXArray<
  | null
  | undefined
  | boolean
  | CompiledStyles
  | Readonly<[CompiledStyles, InlineStyles]>
>;
