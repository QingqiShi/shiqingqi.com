# @tuja/babel-plugin-stylex-css-prop

A Babel plugin that lets you style JSX with a `css` prop and have it compile to
[StyleX](https://stylexjs.com). It rewrites

```jsx
<div css={[styles.base, isActive && styles.active]} />
```

into a `stylex.props(...)` spread:

```jsx
<div {...stylex.props(styles.base, isActive && styles.active)} />
```

so you get StyleX's compile-time class extraction and atomic CSS while writing
the terser, more familiar `css` prop. It also merges gracefully with any
`className` and `style` already on the element, and injects
`import * as stylex from "@stylexjs/stylex"` when a file uses `css` but hasn't
imported StyleX yet.

This plugin powers [`@tuja/ui`](https://www.npmjs.com/package/@tuja/ui). You
only need it if you author components with the `css` prop; consuming `@tuja/ui`
requires it because the library's source uses the prop.

## Install

```sh
npm install --save-dev @tuja/babel-plugin-stylex-css-prop @stylexjs/babel-plugin
```

`@babel/core` (v8) is a peer dependency — your build already provides it.

## Babel setup

**Ordering matters.** This plugin must run **before** `@stylexjs/babel-plugin`,
because it produces the `stylex.props(...)` calls that StyleX then compiles.
Babel runs plugins in array order, so list this one first:

```js
// babel.config.js
module.exports = {
  plugins: [
    "@tuja/babel-plugin-stylex-css-prop",
    // ...any other pre-StyleX plugins (e.g. @tuja/babel-plugin-stylex-breakpoints)
    [
      "@stylexjs/babel-plugin",
      {
        runtimeInjection: false,
        treeshakeCompensation: true,
        styleResolution: "property-specificity",
        enableMediaQueryOrder: true,
        unstable_moduleResolution: { type: "commonJS", rootDir: __dirname },
      },
    ],
  ],
};
```

## TypeScript

The transform is invisible to the type checker, so add a global augmentation
that declares the `css` prop on every JSX element. Drop this into a `.d.ts` that
your `tsconfig.json` includes:

```ts
// css-prop.d.ts
import type {
  CompiledStyles,
  InlineStyles,
  StyleXArray,
} from "@stylexjs/stylex/lib/StyleXTypes";

type StyleProp = StyleXArray<
  null | undefined | boolean | Readonly<[CompiledStyles, InlineStyles]>
>;

declare module "react" {
  interface Attributes {
    css?: StyleProp;
  }
}
```

`@tuja/ui` ships this exact declaration, so instead of copying the block above
you can reference it from your own `.d.ts` with
`/// <reference types="@tuja/ui/css-prop" />`.

## License

MIT
