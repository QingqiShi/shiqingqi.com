# @tuja/ui

The [StyleX](https://stylexjs.com) design system that powers
[qingqi.dev](https://qingqi.dev). It ships:

- **Role-based tokens** — every color is a `light-dark()` pair, so theming is
  driven entirely by `color-scheme`. A color token is named for the property it
  paints (`fg`, `bg`, `border`) and the subject it paints it for. Plus the
  `font`, `space`, `controlSize`, `border`, `shadow`, `layer`, `opacity`, and
  `ratio` scales.
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
  @tuja/babel-plugins
```

`react` (`>=19.2 <20`), `react-dom`, and `@stylexjs/stylex` (`^0.19`) are peer
dependencies.

## Next.js setup

> **Turbopack is not yet supported.** The `css` prop rewrite (a
> `@stylexjs/babel-plugin` option) and the responsive tokens (a custom Babel
> plugin) both need the **webpack / Next Babel** pipeline. Adding a
> `babel.config.js` opts Next out of SWC/Turbopack automatically. Run
> `next dev` / `next build` without `--turbopack`.

### 1. Transpile the package

`@tuja/ui` is distributed as source, so Next must transpile it:

```js
// next.config.js
module.exports = {
  transpilePackages: ["@tuja/ui"],
};
```

### 2. Babel

`@tuja/babel-plugins/stylex-breakpoints` runs **before** `@stylexjs/babel-plugin`:
it inlines the design system's breakpoint constants into media-query keys.
**It is required** — without it the responsive `font` and `controlSize` tokens
emit no media queries. Point its `rootDir` at the installed `@tuja/ui` package
so it can read the shipped `src/breakpoints.stylex.ts`.

The `css` prop rewrite needs no separate plugin: `@stylexjs/babel-plugin`
(0.18+) ships a JSX shorthand for it, `sxPropName` — it defaults to `sx`, and
the config below points it at `css` to match `@tuja/ui`'s own components and
the `css-prop.d.ts` type augmentation.

```js
// babel.config.js
const path = require("node:path");

// Resolve the installed @tuja/ui package directory so the breakpoints plugin
// can read its src/breakpoints.stylex.ts.
const uiRoot = path.dirname(require.resolve("@tuja/ui/package.json"));

module.exports = {
  presets: ["next/babel"],
  plugins: [
    ["@tuja/babel-plugins/stylex-breakpoints", { rootDir: uiRoot }],
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
        sxPropName: "css",
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

The `css` prop is a build-time transform, invisible to the type checker, and it
compiles only on lowercase host elements (`div`, `svg`, …) — `sxPropName`
rewrites those into `stylex.props(...)` calls. A `@tuja/ui` component such as
`Button` or `Card` is not rewritten; it receives `css` as an ordinary component
prop and composes it onto its own root, so it type-checks through its own
props interface with no augmentation needed.

`css` is the only styling entry a `@tuja/ui` component accepts — none of them
take `className` or `style`. Passing either is a type error: the component's
props type omits both, so a component wanting a raw class or an inline style
composes it into `css` itself (a dynamic style function for a runtime value,
per the pattern below) rather than accepting it from the consumer.

For the host-element case, add a global augmentation so `<div css={styles.x} />`
type-checks. Reference the declaration `@tuja/ui` ships from a `.d.ts` your
`tsconfig.json` includes:

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
  | null
  | undefined
  | boolean
  | CompiledStyles
  | Readonly<[CompiledStyles, InlineStyles]>
>;

declare module "react" {
  interface HTMLAttributes<T> {
    css?: StyleProp;
  }
  interface SVGAttributes<T> {
    css?: StyleProp;
  }
}
```

### Runtime values in `css`

A runtime-computed value never goes through `className`/`style` — `css` is
the only channel a `@tuja/ui` component (or a host element) takes. Give
`stylex.create` a function instead of a plain object and it becomes a dynamic
style: the shape of what it returns is fixed at compile time, but the value
comes from wherever the component calls it.

```tsx
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  swatch: (background: string) => ({ backgroundColor: background }),
});

<div css={[styles.base, styles.swatch(hex)]} />;
```

A custom property works the same way: `(x: string) => ({ "--nudge-x": x })`.

The one case that isn't a StyleX value at all is a literal class a
third-party stylesheet targets by name — one that has never heard of `css`.
Compile your own styles and concatenate the class onto the result:

```tsx
const sx = stylex.props(styles.shell);
<div {...sx} className={`${sx.className ?? ""} third-party-class`} />;
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
    color: color.fg,
    colorScheme: "light dark",
    fontFamily: font.family,
  },
});
```

Apply `globalStyles.root` to `<html>`/`<body>`. (This mirrors
`apps/web/src/theme/global-styles.ts` in the source repo.)

Every fixed-radius corner in the system renders as a squircle rather than a
circular arc; pills and circles keep circular caps, because a clamped
superellipse reads as neither. Components compose the `corner` primitive
(`@tuja/ui/primitives/corner.stylex`), which pairs the corner shape with the
radius, so the shape ships inside the styles the component already carries.
There is no global CSS to add, and none of your own components are affected.
A browser without `corner-shape` support keeps circular corners.

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
      <Button look="primary">Save</Button>
    </div>
  );
}
```

## Exports

Most entry points are a StyleX var/const file or a component; a few are
hooks, plain utility functions, or type-only contracts that back the `css`
prop. Import the exact subpath you need — there is no barrel. The set grows
as the system gains components.

| Subpath                                       | What it is                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tuja/ui/css-prop`                           | Global JSX augmentation that types the `css` prop on host elements; add an equivalent declaration to your own project (see Usage) to type-check `css={...}` there too. |
| `@tuja/ui/types`                              | `StyleProp`, the `css` prop's type — type a component's own `css` prop with it too.                                                                                    |
| `@tuja/ui/tokens.stylex`                      | Role-based tokens: `color`, `font`, `space`, `controlSize`, `border`, `shadow`, `layer`, `opacity`, `ratio`, plus layout consts.                                       |
| `@tuja/ui/breakpoints.stylex`                 | Responsive breakpoint constants (media-query strings) for use as computed keys.                                                                                        |
| `@tuja/ui/palette/*.stylex`                   | Per-hue HCT ramp var files (e.g. `@tuja/ui/palette/blue.stylex`). Hues: blue, brown, cyan, gray, green, indigo, mint, orange, pink, purple, red, teal, yellow.         |
| `@tuja/ui/palette-table`                      | Flat palette lookup table (all hues and tones) for tooling and color matching.                                                                                         |
| `@tuja/ui/test-support/install-jsdom-shims`   | `installJsdomShims()` — backs `isContentEditable` and related behaviour jsdom does not implement, for a test suite's setup file.                                       |
| `@tuja/ui/hooks/use-black-hole`               | Ref that makes its element a Black hole on the effect layer, which bends the light of a Light beam passing behind it.                                                  |
| `@tuja/ui/hooks/use-controlled`               | Controlled/uncontrolled state hook.                                                                                                                                    |
| `@tuja/ui/hooks/use-dialog-focus`             | Focus trap + restore for dialogs and overlays.                                                                                                                         |
| `@tuja/ui/hooks/use-disclosure`               | Headless expand/collapse state with the `aria-expanded` / `aria-controls` wiring.                                                                                      |
| `@tuja/ui/hooks/use-dust`                     | Ref that sheds dust in its element's fill colour, which floats off, then speeds into any Extractor fan in reach.                                                       |
| `@tuja/ui/hooks/use-effect-boundary`          | Ref that registers its element on the effect layer with no effect, so effects see it; the layer measures its box, corners and fill whenever they can change.           |
| `@tuja/ui/hooks/use-extractor-fan`            | Ref that makes its element an Extractor fan, which pulls in the dust of `useDust` elements in reach.                                                                   |
| `@tuja/ui/hooks/use-is-hydrated`              | `false` for the server render and the hydration pass, `true` from the first client render after — lets a component defer client-only rendering until then.             |
| `@tuja/ui/hooks/use-light-beam`               | Ref that makes its element a Light beam on the effect layer: a ray of light in its fill colour, aimed by the pointer.                                                  |
| `@tuja/ui/hooks/use-popover`                  | Headless positioning, focus, and dismiss logic behind `Popover` — placement, open state, and trigger wiring.                                                           |
| `@tuja/ui/hooks/use-press-animation`          | Press/active animation state.                                                                                                                                          |
| `@tuja/ui/hooks/use-press-handlers`           | Pointer + keyboard press handler bundle.                                                                                                                               |
| `@tuja/ui/hooks/use-radio-group`              | Headless roving-tabindex radio group (arrow/Home/End keyboard, `getOptionProps`).                                                                                      |
| `@tuja/ui/hooks/use-ripple`                   | Ref that pulses its element's background colour out in rings on the effect layer, on hover, press and focus.                                                           |
| `@tuja/ui/hooks/use-scroll-mask`              | Whether each edge of a scroll region has scrolled-away content past it.                                                                                                |
| `@tuja/ui/utils/get-scroll-behavior`          | `"smooth"`, or `"instant"` under reduced motion — read at scroll time so it always reports the current setting.                                                        |
| `@tuja/ui/utils/merge-refs`                   | `mergeRefs(...refs)` — one callback ref for several refs, with each ref's cleanup; gives one element two effect hooks.                                                 |
| `@tuja/ui/primitives/a11y.stylex`             | Accessibility primitives: `srOnly`, `focusRing`, `focusRingInset`.                                                                                                     |
| `@tuja/ui/primitives/corner.stylex`           | Corner radii paired with shape: squircle on `radius_1`–`radius_5`, circular caps on `radius_round`.                                                                    |
| `@tuja/ui/primitives/flex.stylex`             | Flex row/column layout primitives.                                                                                                                                     |
| `@tuja/ui/primitives/layout.stylex`           | Layout/container primitives.                                                                                                                                           |
| `@tuja/ui/primitives/motion.stylex`           | Motion/transition presets (reduced-motion aware).                                                                                                                      |
| `@tuja/ui/primitives/reset.stylex`            | Element reset styles.                                                                                                                                                  |
| `@tuja/ui/primitives/texture.stylex`          | Texture: one drawn dot of 1px or less, repeated at a pitch, in an ink colour.                                                                                          |
| `@tuja/ui/primitives/wash.stylex`             | Wash: a broad directional gradient, one tone drifting toward transparent.                                                                                              |
| `@tuja/ui/components/anchor-button`           | Button's look rendered as a real anchor (`href` required); pass `linkComponent` for a framework `<Link>`.                                                              |
| `@tuja/ui/components/anchor.stylex`           | Anchor/link style tokens.                                                                                                                                              |
| `@tuja/ui/components/avatar`                  | Portrait/monogram medallion with a decorative corner badge slot.                                                                                                       |
| `@tuja/ui/components/badge`                   | Status/label badge on the Chip pill skin (six Intents plus a default, `sm`/`md`).                                                                                      |
| `@tuja/ui/components/blur-plane-provider`     | Marks a shell's Blur plane — the page-level node a Floating element paints its blur onto.                                                                              |
| `@tuja/ui/components/breadcrumb`              | Navigation trail of crumbs, with the current page as the un-linked last one.                                                                                           |
| `@tuja/ui/components/build-blur-layers`       | Computes a Floating element's stack of blurred layers from its measured geometry — the primitive behind `Popover` and `ProgressiveBlur`.                               |
| `@tuja/ui/components/build-edge-blur-layers`  | Computes the blurred-layer stack for one edge of a scrolling region — the primitive behind `ScrollMask`.                                                               |
| `@tuja/ui/components/button`                  | Button (primary/outline/ghost/danger looks, three sizes, loading state); icon-only with `icon` and no children.                                                        |
| `@tuja/ui/components/button.stylex`           | Button style tokens.                                                                                                                                                   |
| `@tuja/ui/components/button-shared.stylex`    | Shared button styles (base, icon, active, pressed).                                                                                                                    |
| `@tuja/ui/components/callout`                 | Inline message/alert box (six Intents, built-in icon, optional dismiss).                                                                                               |
| `@tuja/ui/components/card`                    | Bordered surface container, plus header/title/description/content/footer slots.                                                                                        |
| `@tuja/ui/components/card-content`            | Card's padded content slot.                                                                                                                                            |
| `@tuja/ui/components/card-description`        | Card's supporting-copy slot, rendered as `Text`.                                                                                                                       |
| `@tuja/ui/components/card-footer`             | Card's trailing-actions slot.                                                                                                                                          |
| `@tuja/ui/components/card-header`             | Card's heading row, with a trailing slot for a menu button, dismiss, or badge.                                                                                         |
| `@tuja/ui/components/card-title`              | Card's heading slot, rendered as `Heading` (defaults to level 3).                                                                                                      |
| `@tuja/ui/components/card.stylex`             | Card surface styles (`cardSurface`) for composing onto a link or list item.                                                                                            |
| `@tuja/ui/components/checkbox`                | Checkbox with label, description, error, and indeterminate states.                                                                                                     |
| `@tuja/ui/components/chip`                    | Interactive pill — renders an anchor with `href`, a button without.                                                                                                    |
| `@tuja/ui/components/chip.stylex`             | Chip surface and size styles for composing onto a framework `<Link>`.                                                                                                  |
| `@tuja/ui/components/code-block`              | Syntax-highlighted code, with an optional animated run-by-run reveal.                                                                                                  |
| `@tuja/ui/components/code-run.stylex`         | Per-token-kind colour for a code run, shared by every code surface.                                                                                                    |
| `@tuja/ui/components/disclosure`              | Expand/collapse section with a header trigger and a revealed panel.                                                                                                    |
| `@tuja/ui/components/divider`                 | Horizontal/vertical divider.                                                                                                                                           |
| `@tuja/ui/components/effect-layer-provider`   | Draws effects with WebGPU on inert `<canvas>` elements over the content; mounts nothing until an element registers with an effect.                                     |
| `@tuja/ui/components/field-shared.stylex`     | Shared form-control chrome (label, description, control box, error text).                                                                                              |
| `@tuja/ui/components/fixed-container-content` | Fixed-position container content wrapper.                                                                                                                              |
| `@tuja/ui/components/glass-surface.stylex`    | The Glass skin: a translucent fill over its own blur, with the lit rim and shadow that make Glass the one surface that floats and casts a shadow.                      |
| `@tuja/ui/components/header-footer-layout`    | Reading-density page shell: floating header controls, optional background and footer.                                                                                  |
| `@tuja/ui/components/heading`                 | Semantic heading (visual size decoupled from level, optional `wrap`).                                                                                                  |
| `@tuja/ui/components/menu-button`             | Button that opens a menu/overlay.                                                                                                                                      |
| `@tuja/ui/components/menu-label`              | Label row inside a menu.                                                                                                                                               |
| `@tuja/ui/components/option-card`             | Selectable card (`row` or `tile` look), radio or checkbox semantics set by its group.                                                                                  |
| `@tuja/ui/components/option-card-group`       | Single- or multiple-select group of `OptionCard`s.                                                                                                                     |
| `@tuja/ui/components/option-card.stylex`      | The selectable-card skin, composed over `cardSurface`.                                                                                                                 |
| `@tuja/ui/components/overlay`                 | Accessible dialog/popover overlay (requires `aria-label` **xor** `aria-labelledby`).                                                                                   |
| `@tuja/ui/components/popover`                 | Anchored floating surface (menu, tooltip, dropdown), positioned off a trigger and dismissed on outside click or Escape.                                                |
| `@tuja/ui/components/popover-surface.stylex`  | The floating-surface skin shared by every popup that hangs off an anchor.                                                                                              |
| `@tuja/ui/components/progress`                | Determinate progress bar.                                                                                                                                              |
| `@tuja/ui/components/progress.stylex`         | Progress indicator tokens (fill size and colour).                                                                                                                      |
| `@tuja/ui/components/progressive-blur`        | A Floating element's blur, painted onto the page's Blur plane instead of the element's own background.                                                                 |
| `@tuja/ui/components/scroll-mask`             | Scroll region with a progressive blur at each edge it can still scroll to.                                                                                             |
| `@tuja/ui/components/section`                 | Labelled content block (quiet heading, optional icon and trailing actions).                                                                                            |
| `@tuja/ui/components/segmented-control`       | Track-style single select over `useRadioGroup`; `hideLabels` for an icon-only bar.                                                                                     |
| `@tuja/ui/components/select`                  | Styled native select (options prop or `<option>` children).                                                                                                            |
| `@tuja/ui/components/sidebar-layout`          | Sidebar + content layout.                                                                                                                                              |
| `@tuja/ui/components/skeleton`                | Loading skeleton.                                                                                                                                                      |
| `@tuja/ui/components/skeleton.stylex`         | Skeleton style tokens.                                                                                                                                                 |
| `@tuja/ui/components/slider`                  | Range input with a filled track and a draggable thumb.                                                                                                                 |
| `@tuja/ui/components/slider.stylex`           | Slider fill, track, and thumb size tokens.                                                                                                                             |
| `@tuja/ui/components/spinner`                 | Indeterminate loading spinner (reduced-motion aware).                                                                                                                  |
| `@tuja/ui/components/sticky-control-group`    | One group of controls in a `StickyControls` row, painted directly onto the shared blur with no surface of its own.                                                     |
| `@tuja/ui/components/sticky-controls`         | Sticky row of page chrome, with the page blurred around each group of its controls while it holds.                                                                     |
| `@tuja/ui/components/switch`                  | Toggle switch.                                                                                                                                                         |
| `@tuja/ui/components/switch.stylex`           | Switch style tokens.                                                                                                                                                   |
| `@tuja/ui/components/syntax.stylex`           | Per-token-kind syntax colour, WCAG AA against `bgSurfaceRaised`.                                                                                                       |
| `@tuja/ui/components/table`                   | Scrollable data table shell.                                                                                                                                           |
| `@tuja/ui/components/table-body`              | Table row group (`<tbody>`).                                                                                                                                           |
| `@tuja/ui/components/table-cell`              | Table data cell (`<td>`), with start/center/end/numeric alignment.                                                                                                     |
| `@tuja/ui/components/table-foot`              | Table foot row group (`<tfoot>`).                                                                                                                                      |
| `@tuja/ui/components/table-head`              | Table head row group (`<thead>`), optionally sticky.                                                                                                                   |
| `@tuja/ui/components/table-header-cell`       | Table header cell (`<th>`), with the same alignment as `TableCell`.                                                                                                    |
| `@tuja/ui/components/table-row`               | Table row (`<tr>`), with a current-row state.                                                                                                                          |
| `@tuja/ui/components/table.stylex`            | Table layout tokens (sticky head inset and background).                                                                                                                |
| `@tuja/ui/components/text`                    | Text/paragraph component (four type-scale steps, four foreground roles, four weights, `wrap`, `numeric`).                                                              |
| `@tuja/ui/components/text-field`              | Single-line text input with label, description, error, and adornments.                                                                                                 |
| `@tuja/ui/components/textarea`                | Multi-line text input with optional auto-grow.                                                                                                                         |
| `@tuja/ui/package.json`                       | Package manifest (for tooling).                                                                                                                                        |

## SSR & RSC

Token and `*.stylex` modules are server-safe and render on the server without a
client boundary. Components that need interactivity mark their own `"use client"`
boundaries, so you can import them from Server Components — the boundary lands
where it's needed, not at your call site.

## License

MIT © Qingqi Shi
