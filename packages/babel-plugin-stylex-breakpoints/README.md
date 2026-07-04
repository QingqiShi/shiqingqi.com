# @tuja/babel-plugin-stylex-breakpoints

A Babel plugin that lets you define responsive breakpoints once as StyleX
constants and use them as media-query keys anywhere, with correct mobile-first
ordering.

Define breakpoints with `stylex.defineConsts`:

```ts
// src/breakpoints.stylex.ts
import * as stylex from "@stylexjs/stylex";

export const breakpoints = stylex.defineConsts({
  sm: "@media (min-width: 320px)",
  md: "@media (min-width: 768px)",
  lg: "@media (min-width: 1080px)",
  xl: "@media (min-width: 2000px)",
});
```

then reference them as computed keys in `stylex.create` / `stylex.defineVars`:

```ts
export const font = stylex.defineVars({
  vpDisplay: {
    default: "2.4rem",
    [breakpoints.sm]: "2.8rem",
    [breakpoints.md]: "3.75rem",
    [breakpoints.lg]: "5.25rem",
  },
});
```

The plugin rewrites each `breakpoints.md` key into its media-query string
**before** `@stylexjs/babel-plugin` runs, so StyleX emits the responsive rules
in a stable, mobile-first order.

## Why it's required

`@stylexjs/babel-plugin` does not resolve `defineConsts` members imported from
another module when they are used as object **keys**. Without this plugin those
conditional values are silently dropped and **no media-query CSS is generated**
for responsive tokens. If you consume `@tuja/ui`, this plugin is mandatory — the
design system's `font` and `controlSize` tokens are responsive.

## Install

```sh
npm install --save-dev @tuja/babel-plugin-stylex-breakpoints @stylexjs/babel-plugin
```

`@babel/core` (v8) is a peer dependency; `@babel/parser` and `@babel/traverse`
are bundled as dependencies.

## Babel setup

**Ordering matters.** This plugin must run **before** `@stylexjs/babel-plugin`.
It reads breakpoints from `<rootDir>/src/breakpoints.stylex.ts`, so point
`rootDir` at whichever package owns that file.

When consuming `@tuja/ui`, the breakpoints file ships inside the package, so
`rootDir` must resolve to the installed package directory:

```js
// babel.config.js
const path = require("node:path");

const uiRoot = path.dirname(require.resolve("@tuja/ui/package.json"));

module.exports = {
  plugins: [
    "@tuja/babel-plugin-stylex-css-prop",
    ["@tuja/babel-plugin-stylex-breakpoints", { rootDir: uiRoot }],
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

If you define your own `src/breakpoints.stylex.ts`, set `rootDir` to your own
package root instead. The plugin throws at build time if the file is missing or
does not contain a `stylex.defineConsts({ ... })` call.

## License

MIT
