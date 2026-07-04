# @tuja/ui

The [StyleX](https://stylexjs.com) design system that powers
[qingqi.dev](https://qingqi.dev). It ships:

- **Role-based tokens** — every color is a `light-dark()` pair, so theming is
  driven entirely by `color-scheme`. Plus `font`, `space`, `controlSize`,
  `border`, `shadow`, `layer`, and `ratio` scales.
- **A generated 13-hue HCT palette** — perceptually even ramps (blue, brown,
  cyan, gray, green, indigo, mint, orange, pink, purple, red, teal, yellow),
  each exported as a StyleX var file.
- **Composable primitives** — flex/layout/motion/reset style objects you spread
  through the `css` prop.
- **Accessible React components** — buttons, overlays, switches, headings,
  badges, skeletons, and more, with focus management and keyboard behaviour
  built in.

> **Live showcase:** <https://qingqi.dev/en/design-system>

`@tuja/ui` ships **raw TypeScript source**. StyleX is a compile-time system:
your build must run the StyleX Babel plugin over the library source (alongside
your own) to extract its atomic CSS. That means a small amount of one-time build
configuration — the sections below walk through it.

## Install

```sh
npm install @tuja/ui @stylexjs/stylex
npm install --save-dev \
  @stylexjs/babel-plugin \
  @tuja/babel-plugin-stylex-css-prop \
  @tuja/babel-plugin-stylex-breakpoints
```

`react` (`>=19.2 <20`), `react-dom`, and `@stylexjs/stylex` (`^0.19`) are peer
dependencies.

## Next.js setup

> **Turbopack is not yet supported.** The `css` prop and responsive tokens rely
> on custom Babel plugins, so the app must build through the **webpack / Next
> Babel** pipeline. Adding a `babel.config.js` opts Next out of SWC/Turbopack
> automatically. Run `next dev` / `next build` without `--turbopack`.

### 1. Transpile the package

`@tuja/ui` is distributed as source, so Next must transpile it:

```js
// next.config.js
module.exports = {
  transpilePackages: ["@tuja/ui"],
};
```

### 2. Babel

Two plugins run **before** `@stylexjs/babel-plugin`, in this order:

- **`@tuja/babel-plugin-stylex-css-prop`** rewrites `css={...}` into
  `stylex.props(...)`.
- **`@tuja/babel-plugin-stylex-breakpoints`** inlines the design system's
  breakpoint constants into media-query keys. **It is required** — without it
  the responsive `font` and `controlSize` tokens emit no media queries. Point
  its `rootDir` at the installed `@tuja/ui` package so it can read the shipped
  `src/breakpoints.stylex.ts`.

```js
// babel.config.js
const path = require("node:path");

// Resolve the installed @tuja/ui package directory so the breakpoints plugin
// can read its src/breakpoints.stylex.ts.
const uiRoot = path.dirname(require.resolve("@tuja/ui/package.json"));

module.exports = {
  presets: ["next/babel"],
  plugins: [
    "@tuja/babel-plugin-stylex-css-prop",
    ["@tuja/babel-plugin-stylex-breakpoints", { rootDir: uiRoot }],
    [
      "@stylexjs/babel-plugin",
      {
        dev: process.env.NODE_ENV === "development",
        test: process.env.NODE_ENV === "test",
        runtimeInjection: false,
        genConditionalClasses: true,
        treeshakeCompensation: true,
        styleResolution: "property-specificity",
        enableMediaQueryOrder: true,
        unstable_moduleResolution: {
          type: "commonJS",
          // Repo/workspace root — where StyleX resolves module paths from.
          rootDir: path.resolve(__dirname),
        },
      },
    ],
  ],
};
```

### 3. PostCSS

The StyleX PostCSS plugin extracts the actual stylesheet. Its `include` globs
must cover **both** your source and the `@tuja/ui` source in `node_modules`:

```js
// postcss.config.js
const path = require("node:path");

module.exports = {
  plugins: {
    "postcss-import": {},
    "@stylexjs/postcss-plugin": {
      include: [
        "src/**/*.{js,jsx,ts,tsx}",
        "./node_modules/@tuja/ui/src/**/*.{js,jsx,ts,tsx}",
      ],
      useCSSLayers: true,
      babelConfig: { configFile: path.resolve(__dirname, "babel.config.js") },
    },
    "postcss-preset-env": {
      stage: 3,
      features: { "custom-properties": false },
    },
  },
};
```

Then add the StyleX directive to your global stylesheet — the PostCSS plugin
replaces it with the generated CSS:

```css
/* global.css */
@stylex;
```

## TypeScript

`@tuja/ui`'s source imports use explicit `.ts` extensions (e.g.
`@tuja/ui/tokens.stylex`), so your `tsconfig.json` needs bundler resolution:

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
  },
}
```

### The `css` prop type

The `css` prop is a build-time transform, invisible to the type checker. Add a
global augmentation so `<div css={styles.x} />` type-checks. Reference the
declaration `@tuja/ui` ships from a `.d.ts` your `tsconfig.json` includes:

```ts
// css-prop.d.ts
/// <reference types="@tuja/ui/css-prop" />
```

Or copy the augmentation inline instead:

```ts
// css-prop.d.ts
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
```

## Theming

Every color token is a single-source `light-dark()` pair, so there is no second
set of theme variables — the browser resolves the correct value from
`color-scheme`. Set the scheme once on the root element:

```ts
// Follows the OS preference by default:
color-scheme: light dark;
```

To pin a theme, override the scheme on `:root` (or any subtree):

```ts
color-scheme: dark; /* or: light */
```

Because theming leans on `light-dark()`, the browser floor is **Chrome 123**,
**Safari 17.5**, and **Firefox 120**.

## Fonts

The `font.family` token is `"Inter,Inter-fallback,sans-serif"`. If you provide
Inter, glyph metrics stay pixel-stable; if you omit it, everything falls back to
the platform sans-serif and still renders. To self-host Inter, drop the
optimized `woff2` into your public directory and register both the real face and
a metric-matched fallback:

```css
@font-face {
  font-family: "Inter";
  src: url("/InterVariableOptimized.woff2");
  font-style: oblique 0deg 10deg;
  font-weight: 100 900;
  font-display: fallback;
}

/* size-adjust + ascent-override keep the fallback from shifting layout before
   Inter loads. */
@font-face {
  font-family: "Inter-fallback";
  size-adjust: 107%;
  ascent-override: 90%;
  src:
    local("Segoe UI"), local("Roboto"), local("Helvetica Neue"),
    local("Helvetica"), local("Arial");
}
```

## Global contract

The system assumes a modern box model and reset. Include something like
[`modern-normalize`](https://github.com/sindresorhus/modern-normalize) (or your
own `box-sizing: border-box` + margin reset), then paint the canvas and default
text color from tokens on the document root:

```ts
import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

export const globalStyles = stylex.create({
  root: {
    backgroundColor: color.bgCanvas,
    color: color.textMain,
    colorScheme: "light dark",
    fontFamily: font.family,
  },
});
```

Apply `globalStyles.root` to `<html>`/`<body>`. (This mirrors
`apps/web/src/app/global-styles.ts` in the source repo.)

## Usage

Import tokens and primitives, compose them through the `css` prop, and use
components directly:

```tsx
import { color, space } from "@tuja/ui/tokens.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { Button } from "@tuja/ui/components/button";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  card: {
    padding: space._4,
    backgroundColor: color.bgSurface,
    borderRadius: space._2,
  },
});

export function Example() {
  return (
    <div css={[flex.column, styles.card]}>
      <Button variant="primary">Save</Button>
    </div>
  );
}
```

## Exports

Every entry point is a StyleX var/const file or a component. Import the exact
subpath you need — there is no barrel. The set grows as the system gains
components.

| Subpath                                       | What it is                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tuja/ui/tokens.stylex`                      | Role-based tokens: `color`, `font`, `space`, `controlSize`, `border`, `shadow`, `layer`, `ratio`, plus layout consts.                                   |
| `@tuja/ui/breakpoints.stylex`                 | Responsive breakpoint constants (media-query strings) for use as computed keys.                                                                         |
| `@tuja/ui/palette/*`                          | Per-hue HCT ramp var files (e.g. `@tuja/ui/palette/blue`). Hues: blue, brown, cyan, gray, green, indigo, mint, orange, pink, purple, red, teal, yellow. |
| `@tuja/ui/palette-table`                      | Flat palette lookup table (all hues and tones) for tooling and color matching.                                                                          |
| `@tuja/ui/author/token-registry`              | Authoring metadata: which tokens are editable and how, derived from the token objects.                                                                  |
| `@tuja/ui/author/palette-match`               | Maps an arbitrary color to the nearest palette swatch (deterministic, browser-safe).                                                                    |
| `@tuja/ui/hooks/use-controlled`               | Controlled/uncontrolled state hook.                                                                                                                     |
| `@tuja/ui/hooks/use-dialog-focus`             | Focus trap + restore for dialogs and overlays.                                                                                                          |
| `@tuja/ui/hooks/use-press-animation`          | Press/active animation state.                                                                                                                           |
| `@tuja/ui/hooks/use-press-handlers`           | Pointer + keyboard press handler bundle.                                                                                                                |
| `@tuja/ui/hooks/use-radio-group`              | Headless roving-tabindex radio group (arrow/Home/End keyboard, `getOptionProps`).                                                                       |
| `@tuja/ui/primitives/a11y.stylex`             | Accessibility primitives: `srOnly`, `focusRing`, `focusRingInset`.                                                                                      |
| `@tuja/ui/primitives/flex.stylex`             | Flex row/column layout primitives.                                                                                                                      |
| `@tuja/ui/primitives/layout.stylex`           | Layout/container primitives.                                                                                                                            |
| `@tuja/ui/primitives/motion.stylex`           | Motion/transition presets (reduced-motion aware).                                                                                                       |
| `@tuja/ui/primitives/reset.stylex`            | Element reset styles.                                                                                                                                   |
| `@tuja/ui/components/anchor.stylex`           | Anchor/link style tokens.                                                                                                                               |
| `@tuja/ui/components/anchor-button-group`     | Grouped anchor/button cluster.                                                                                                                          |
| `@tuja/ui/components/animate-to-target`       | FLIP-style animate-to-target wrapper.                                                                                                                   |
| `@tuja/ui/components/badge`                   | Status/label badge (seven tones, two sizes).                                                                                                            |
| `@tuja/ui/components/button`                  | Button component.                                                                                                                                       |
| `@tuja/ui/components/button.stylex`           | Button style tokens.                                                                                                                                    |
| `@tuja/ui/components/button-shared.stylex`    | Shared button styles (base, icon, active, pressed).                                                                                                     |
| `@tuja/ui/components/callout`                 | Inline message/alert box (six tones, built-in glyph, optional dismiss).                                                                                 |
| `@tuja/ui/components/checkbox`                | Checkbox with label, description, error, and indeterminate states.                                                                                      |
| `@tuja/ui/components/divider`                 | Horizontal/vertical divider.                                                                                                                            |
| `@tuja/ui/components/field-shared.stylex`     | Shared form-control chrome (label, description, control box, error text).                                                                               |
| `@tuja/ui/components/fixed-container-content` | Fixed-position container content wrapper.                                                                                                               |
| `@tuja/ui/components/heading`                 | Semantic heading (visual size decoupled from level).                                                                                                    |
| `@tuja/ui/components/icon-button`             | Compact icon-only button (requires `aria-label` **xor** `aria-labelledby`).                                                                             |
| `@tuja/ui/components/menu-button`             | Button that opens a menu/overlay.                                                                                                                       |
| `@tuja/ui/components/menu-label`              | Label row inside a menu.                                                                                                                                |
| `@tuja/ui/components/overlay`                 | Accessible dialog/popover overlay (requires `aria-label` **xor** `aria-labelledby`).                                                                    |
| `@tuja/ui/components/select`                  | Styled native select (options prop or `<option>` children).                                                                                             |
| `@tuja/ui/components/sidebar-layout`          | Sidebar + content layout.                                                                                                                               |
| `@tuja/ui/components/skeleton`                | Loading skeleton.                                                                                                                                       |
| `@tuja/ui/components/skeleton.stylex`         | Skeleton style tokens.                                                                                                                                  |
| `@tuja/ui/components/spinner`                 | Indeterminate loading spinner (reduced-motion aware).                                                                                                   |
| `@tuja/ui/components/switch`                  | Toggle switch.                                                                                                                                          |
| `@tuja/ui/components/switch.stylex`           | Switch style tokens.                                                                                                                                    |
| `@tuja/ui/components/text`                    | Text/paragraph component.                                                                                                                               |
| `@tuja/ui/components/text-field`              | Single-line text input with label, description, error, and adornments.                                                                                  |
| `@tuja/ui/components/textarea`                | Multi-line text input with optional auto-grow.                                                                                                          |
| `@tuja/ui/package.json`                       | Package manifest (for tooling).                                                                                                                         |

## SSR & RSC

Token and `*.stylex` modules are server-safe and render on the server without a
client boundary. Components that need interactivity mark their own `"use client"`
boundaries, so you can import them from Server Components — the boundary lands
where it's needed, not at your call site.

## License

MIT © Qingqi Shi
