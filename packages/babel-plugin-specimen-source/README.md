# @tuja/babel-plugin-specimen-source

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

## Install

```sh
npm install --save-dev @tuja/babel-plugin-specimen-source
```

`@babel/core` (v8) is a peer dependency — your build already provides it.

## Babel setup

**Ordering matters.** The plugin quotes the file as the author wrote it, so it
must run **before** any plugin that rewrites the source. Babel runs plugins in
array order, so list this one first:

```js
// babel.config.js
module.exports = {
  plugins: [
    "@tuja/babel-plugin-specimen-source",
    // …everything that rewrites source, such as @tuja/i18n-babel-plugin
  ],
};
```

## What it builds

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

## How it tokenises

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

## The token format

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
} = require("@tuja/babel-plugin-specimen-source/src/token-kinds.js");
```

## TypeScript

The transform is invisible to the type checker, so declare the prop yourself:

```ts
interface SpecimenProps {
  /** Injected by the Babel plugin. Never write this by hand. */
  source?: readonly CodeToken[];
}
```

## License

MIT
