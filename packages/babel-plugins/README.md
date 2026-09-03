# @tuja/babel-plugins

`@tuja/babel-plugins` collects the Babel plugins that build qingqi.dev:
`@tuja/babel-plugins/specimen-source` reads the original source of every
`<Specimen>` and `<UsageSnippet>` and injects it back as a syntax-highlighted
token array, `@tuja/babel-plugins/stylex-breakpoints` inlines StyleX
breakpoint constants into media-query keys, and `@tuja/babel-plugins/i18n`
compiles the site's `t()` calls.

## @tuja/babel-plugins/specimen-source

A Babel plugin that lets a design-system page reveal the code behind a
specimen. It reads the original text of every `<Specimen>` and
`<UsageSnippet>`, turns it into a syntax-highlighting token array, and injects
that back as a `source` prop:

```jsx
<Specimen caption="primary">
  <Button variant="primary">{t({ en: "Primary", zh: "主要" })}</Button>
</Specimen>
```

compiles to a specimen carrying its own source:

```jsx
<Specimen
  caption="primary"
  source={[
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{"],
    // …
  ]}
>
  <Button variant="primary">{t({ en: "Primary", zh: "主要" })}</Button>
</Specimen>
```

which reads back as:

```tsx
import { Button } from "@tuja/ui/components/button";

<Button variant="primary">Primary</Button>;
```

The tokeniser runs at build time, so no highlighting library reaches the
browser. An element that already writes a `source` prop is left alone, so
`source={undefined}` is how a test asks for a specimen with no source.

### Install

```sh
npm install --save-dev @tuja/babel-plugins/specimen-source
```

`@babel/core` (v8) is a peer dependency — your build already provides it.

### Babel setup

**Ordering matters.** The plugin quotes the file as the author wrote it, so it
must run **before** any plugin that rewrites the source. Babel runs plugins in
array order, so list this one first:

```js
// babel.config.js
module.exports = {
  plugins: [
    "@tuja/babel-plugins/specimen-source",
    // …everything that rewrites source, such as @tuja/babel-plugins/i18n
  ],
};
```

### What it builds

For a `<Specimen>`, from its children:

1. The children, printed from the original text.
2. Documentation chrome dropped: `ApiGrid`, `DoDont`, `GuideNote`,
   `PropsTable`, `ShowcaseHelper`, `UsageSnippet`.
3. `t({ en: "Primary", zh: "主要" })` unwrapped to the English it stands for —
   `Primary` as a JSX child, `"Primary"` anywhere else.
4. A common left edge stripped, and the blank lines at either end.
5. An import header: one declaration for every imported name the code
   references, grouped by source and ordered the way `import-x/order` orders
   them.
6. The source of every component the module declares and the snippet reaches,
   including the ones it reaches only through another component, each once and
   in declaration order.
7. Tokenised.

For a `<UsageSnippet code={…}>`, the code string is tokenised as it stands. The
`code` prop can be a string literal, a template literal with no holes, or a
name that resolves to a module-level constant holding either.

### How it tokenises

The tokeniser parses the source with `@babel/core`, the peer dependency the
plugin already needs. It then walks Babel's own token stream and fills every
gap between two tokens with a plain run, which is what makes the runs
reproduce the input. The AST supplies the kinds a token stream cannot: a
lowercase element name is a `tag` and any other one is a `component`, an
attribute name is an `attr`, and an object key or a name after a dot is a
`property`.

Four cases need care:

- **Element text is prose, not code.** A word such as `type` or `in` inside
  `<Text>…</Text>` keeps the colour of the sentence around it.
- **Sibling elements.** A specimen can show one element beside another with no
  `;` between them, which Babel reads as one malformed element. The tokeniser
  replaces one whitespace character between them with a `;`, and repeats that
  for up to 40 separators. Each replacement keeps the length of the source, so
  every run still quotes the original text. Only that one parse error is
  repaired; every other one fails at once, with the parse error as the `cause`.
- **An elided fragment does not parse.** A snippet cannot drop the
  `stylex.create({ … })` from around two object properties, the way a prose
  example often does. Babel reads the whole snippet, so write the enclosing form
  and let the reader see it.
- **A contextual keyword is matched by spelling.** A variable named `from`,
  `type`, `of` or `as` is coloured as a keyword, because the token stream calls
  each one a plain name. Deriving the role of each from the AST would cost about
  as much code as the walk above.

A snippet that Babel cannot parse fails the build. The error quotes the first
lines of the snippet, and Babel's code frame points at the `<Specimen>` or
`<UsageSnippet>` that holds it. The parse error itself is the `cause`. Write
TypeScript or TSX in a `<Specimen>` and in `<UsageSnippet code={…}>` — prose
belongs in a `//` comment.

### The token format

One highlighted run is a `[kind, text]` pair, and a source is a flat array of
them. Concatenating every run's text reproduces the input exactly, so a
renderer only has to wrap each run in a coloured span.

```ts
type CodeTokenKind =
  | "plain" // whitespace and anything with no other role
  | "keyword" // import, from, const, type, return, function
  | "string" // "…", '…', `…`
  | "comment" // // … and /* … */
  | "number"
  | "tag" // JSX element name starting lowercase — div, span
  | "component" // JSX element name starting uppercase — Button, Card
  | "attr" // JSX attribute name
  | "property" // object key, and the name after a dot
  | "punct"; // < > / { } = ( ) , ; : …

type CodeToken = readonly [CodeTokenKind, string];
```

The list is also exported at runtime, so the consumer can assert that its own
copy of the union still agrees:

```js
const {
  TOKEN_KINDS,
} = require("@tuja/babel-plugins/specimen-source/token-kinds");
```

### TypeScript

The transform is invisible to the type checker, so declare the prop yourself:

```ts
interface SpecimenProps {
  /** Injected by the Babel plugin. Never write this by hand. */
  source?: readonly CodeToken[];
}
```

## @tuja/babel-plugins/stylex-breakpoints

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

### Why it's required

`@stylexjs/babel-plugin` does not resolve `defineConsts` members imported from
another module when they are used as object **keys**. Without this plugin those
conditional values are silently dropped and **no media-query CSS is generated**
for responsive tokens. If you consume `@tuja/ui`, this plugin is mandatory — the
design system's `font` and `controlSize` tokens are responsive.

### Install

```sh
npm install --save-dev @tuja/babel-plugins/stylex-breakpoints @stylexjs/babel-plugin
```

`@babel/core` (v8) is a peer dependency; `@babel/parser` and `@babel/traverse`
are bundled as dependencies.

### Babel setup

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
    ["@tuja/babel-plugins/stylex-breakpoints", { rootDir: uiRoot }],
    [
      "@stylexjs/babel-plugin",
      {
        sxPropName: "css",
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

## @tuja/babel-plugins/i18n

The site's private `t()` transform. It compiles the inline `t()` calls used
across `apps/web` into locale bundles at build time. It is documented in
`apps/web/CONTEXT.md` and `.claude/skills/i18n-patterns/SKILL.md`. It is not
meant for use outside `apps/web`.

## License

MIT
