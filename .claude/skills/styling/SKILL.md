---
name: styling
description: StyleX styling system with project-specific design tokens, composable primitives, and custom css prop. MUST consult this skill before writing or modifying ANY styles in this project — the codebase uses custom design tokens, flex primitives, motion presets, and a css prop that differs from standard StyleX. Trigger whenever the user asks to create components, modify visual appearance, fix spacing/layout, add hover/focus effects, animations, responsive behavior, or anything involving CSS, styling, design tokens, breakpoints, or the css prop.
---

# StyleX Styling

This project uses StyleX for all styling. The system has three layers: **design tokens** for values, **design primitives** for multi-property patterns, and **`stylex.create`** for component-specific styles. All styles are applied via a custom `css` prop.

## Quick Decision Guide

| Need                                                   | Use                           | Example                                         |
| ------------------------------------------------------ | ----------------------------- | ----------------------------------------------- |
| Flex layout, fills, truncation, resets, transitions    | Design primitives             | `css={flex.row}`                                |
| Override a primitive's default                         | Layout modifier               | `css={[flex.row, align.end]}`                   |
| Single-property styling (color, spacing, font, border) | `stylex.create` + tokens      | `color: color.textMain`                         |
| Responsive behavior                                    | `stylex.create` + breakpoints | `{ default: "none", [breakpoints.md]: "flex" }` |
| Pseudo-selectors (hover, focus)                        | `stylex.create`               | `{ default: val, ":hover": hoverVal }`          |

## The `css` Prop

Use `css={styles.foo}` instead of `{...stylex.props(styles.foo)}`. This is StyleX's official JSX shorthand (`sx`), configured under the name `css` via the `sxPropName` Babel option.

```tsx
// Single style
<div css={styles.card}>

// Composed — array of styles, primitives, and conditionals
<div css={[flex.row, styles.header, isActive && styles.active]}>
```

**The transform only compiles `css` on lowercase host elements** (`div`, `svg`, …). On a component, `css` is a real runtime prop carrying raw StyleX styles:

- A component that should take styles declares `css?: StyleProp` (from `@tuja/ui/css-prop-types`, or `#src/css-prop-types.ts` inside the ui package) and composes it **last** into its root element's `css` array: `css={[styles.base, css]}`. Every `@tuja/ui` component works this way — `css` is the only styling entry; components do not accept `className` or `style`.
- NEVER pass `css` to a third-party component (next/link, next/image, Phosphor icons) — it doesn't know the prop. Spread compiled props instead: `<Link {...stylex.props(styles.cta)}>`.
- NEVER put an explicit `className=`/`style=` attribute on the same host element as `css=` — the compiled spread and the attributes clobber each other, and merging is never needed:
  - A runtime-computed value belongs in a **dynamic style function**, not a `style` attribute: `stylex.create({ swatch: (bg: string) => ({ backgroundColor: bg }) })`, applied as `css={[styles.tone, styles.swatch(hex)]}`. Custom properties work too: `(x: string) => ({ "--nudge-x": x })`.
  - A literal class required by a third-party stylesheet (the repo has exactly one: LyteNyte's `ln-grid` in media-table.tsx) is concatenated inline: `const sx = stylex.props(...); <div {...sx} className={`${sx.className ?? ""} ln-grid`}>`.

## Design Tokens

Import from `#src/tokens.stylex.ts`. All tokens are theme-aware. For the full catalog of every token and its values, read `references/tokens.md`.

Categories: `color`, `space`, `controlSize`, `font`, `border`, `shadow`, `layer`, `ratio`.

```tsx
import { color, space, border, font } from "#src/tokens.stylex.ts";

const styles = stylex.create({
  card: {
    padding: space._4,
    borderRadius: border.radius_3,
    backgroundColor: color.backgroundRaised,
    fontSize: font.uiBody,
  },
});
```

## Breakpoints

Import from `#src/breakpoints.stylex.ts`. Values: `sm` (320px), `md` (768px), `lg` (1080px), `xl` (2000px).

```tsx
import { breakpoints } from "#src/breakpoints.stylex.ts";

const styles = stylex.create({
  grid: {
    display: { default: "none", [breakpoints.md]: "grid" },
    gridTemplateColumns: { default: "1fr", [breakpoints.lg]: "repeat(3, 1fr)" },
  },
});
```

## Design Primitives

Composable multi-property styles in `src/primitives/`. Each primitive bundles 2+ CSS properties that encode a common pattern. For full API tables, read `references/primitives.md`.

### Flex (`#src/primitives/flex.stylex.ts`)

The most commonly used primitives. Flex patterns set `display: flex` plus layout defaults:

- `flex.row` — horizontal, vertically centered
- `flex.col` — vertical stack
- `flex.center` — centered both axes
- `flex.between` — space-between with vertical centering
- `flex.wrap` — wrapping row
- `flex.inlineCenter` — inline-flex centered

Override defaults with **modifiers**: `align.{start,center,end,baseline,stretch}`, `justify.{start,center,end,between}`, `grow.{_0,_1}`, `shrink.{_0,_1}`.

```tsx
import { flex, align, justify } from "#src/primitives/flex.stylex.ts";

<div css={flex.row}>                        {/* basic row */}
<div css={[flex.row, align.end]}>           {/* row, bottom-aligned */}
<header css={flex.between}>                 {/* toolbar pattern */}
<div css={[flex.col, justify.center]}>      {/* vertically centered column */}
```

### Other Primitives (see `references/primitives.md`)

- **Layout** — position fills, scroll containers, truncation, image fit
- **Reset** — `buttonReset.base` strips browser button chrome
- **Motion** — transition/animation presets with reduced-motion handling

## Best Practices

1. **Primitives for multi-property patterns** — flex, fills, truncation, resets, transitions
2. **Tokens for single properties** — `fontSize: font.uiBody`, `gap: space._3`
3. **Always use the `css` prop** — never `{...stylex.props()}`
4. **Conditional styles via arrays** — `css={[base, condition && conditional]}`
5. **Mobile-first** — use breakpoint overrides for larger screens
6. **Theme-aware colors** — use `color` tokens that adapt to light/dark
7. **Logical properties** — prefer `paddingBlock`/`paddingInline` over directional
8. **Pseudo-selectors as object keys** — `{ default: val, ":hover": hoverVal }`
