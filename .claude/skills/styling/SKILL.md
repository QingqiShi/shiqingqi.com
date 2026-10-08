---
name: styling
description: StyleX styling system with project-specific design tokens, composable primitives, and custom css prop. MUST consult this skill before writing or modifying ANY styles in this project — the codebase uses custom design tokens, flex primitives, motion presets, and a css prop that differs from standard StyleX. Trigger whenever the user asks to create components, modify visual appearance, fix spacing/layout, add hover/focus effects, animations, responsive behavior, or anything involving CSS, styling, design tokens, breakpoints, or the css prop.
---

# StyleX Styling

This project uses StyleX for all styling. The system has three layers: **design tokens** for values, **design primitives** for multi-property patterns, and **`stylex.create`** for component-specific styles. All styles are applied via a custom `css` prop.

The import paths below are the `@tuja/ui` package exports that `apps/web` uses. Inside `packages/ui`, import the same files by relative path, such as `../../tokens.stylex.ts` from a component.

## Quick Decision Guide

| Need                                                | Use                             | Example                                         |
| --------------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| Flex layout, fills, truncation, resets, transitions | Design primitives               | `css={flex.row}`                                |
| Space between siblings (a stack, a row)             | Stack primitives / `rhythm`     | `css={stack.item}`, `gap: rhythm.tight`         |
| Text size, line height, weight, tracking            | `Text`/`Heading`, or `typeRole` | `css={[typeRole.label, styles.navItem]}`        |
| Cap a line of prose                                 | `measure` tokens                | `maxInlineSize: measure.prose`                  |
| Rounded corners                                     | Design primitives (`corner.*`)  | `css={corner.radius_3}`                         |
| Override a primitive's default                      | Layout modifier                 | `css={[flex.row, align.end]}`                   |
| Single-property styling (color, padding, border)    | `stylex.create` + tokens        | `color: color.fg`                               |
| Responsive behavior                                 | `stylex.create` + breakpoints   | `{ default: "none", [breakpoints.md]: "flex" }` |
| Pseudo-selectors (focus, active)                    | `stylex.create`                 | `{ default: val, ":focus-visible": focusVal }`  |
| Hover                                               | `stylex.create` + `pointer`     | see [Hover](#hover)                             |

## The `css` Prop

Use `css={styles.foo}` instead of `{...stylex.props(styles.foo)}`. This is StyleX's official JSX shorthand (`sx`), configured under the name `css` via the `sxPropName` Babel option.

```tsx
// Single style
<div css={styles.card}>

// Composed — array of styles, primitives, and conditionals
<div css={[flex.row, styles.header, isActive && styles.active]}>
```

**The transform only compiles `css` on lowercase host elements** (`div`, `svg`, …). On a component, `css` is a real runtime prop carrying raw StyleX styles:

- A component that should take styles declares `css?: StyleProp` (from `@tuja/ui/types`, or `src/types.ts` by relative path inside `packages/ui`) and composes it **last** into its root element's `css` array: `css={[styles.base, css]}`. Every `@tuja/ui` component works this way — `css` is the only styling entry; components do not accept `className` or `style`.
- NEVER pass `css` to a third-party component (next/link, next/image, Phosphor icons) — it doesn't know the prop. Spread compiled props instead: `<Link {...stylex.props(styles.cta)}>`.
- NEVER put an explicit `className=`/`style=` attribute on the same host element as `css=` — the compiled spread and the attributes clobber each other, and merging is never needed:
  - A runtime-computed value belongs in a **dynamic style function**, not a `style` attribute: `stylex.create({ swatch: (bg: string) => ({ backgroundColor: bg }) })`, applied as `css={[styles.tone, styles.swatch(hex)]}`. Custom properties work too: `(x: string) => ({ "--nudge-x": x })`.
  - A literal class required by a third-party stylesheet (the repo has exactly one: LyteNyte's `ln-grid` in media-table.tsx) is concatenated inline: `const sx = stylex.props(...); <div {...sx} className={`${sx.className ?? ""} ln-grid`}>`.

## Design Tokens

Import from `@tuja/ui/tokens.stylex`. All tokens are theme-aware. For the full catalog of every token and its values, read `references/tokens.md`.

Categories: `color`, `rhythm`, `space`, `controlSize`, `font`, `border`, `shadow`, `layer`, `opacity`, `ratio`, plus the `constants`, `layout` and `measure` consts.

```tsx
import { color, space, border, font } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  card: {
    padding: space._4,
    borderWidth: border.size_1,
    backgroundColor: color.bgSurfaceRaised,
    fontFamily: font.familyMono,
  },
});
```

Rounded corners are the one exception: don't reach for a bare `border.radius_*` here — use the `corner` primitive below instead, so the radius always ships paired with its corner shape.

## Breakpoints

Import from `@tuja/ui/breakpoints.stylex`. Values: `sm` (320px), `md` (768px), `lg` (1080px), `xl` (2000px).

```tsx
import { breakpoints } from "@tuja/ui/breakpoints.stylex";

const styles = stylex.create({
  grid: {
    display: { default: "none", [breakpoints.md]: "grid" },
    gridTemplateColumns: { default: "1fr", [breakpoints.lg]: "repeat(3, 1fr)" },
  },
});
```

## Hover

A tap on a touch screen leaves `:hover` matching until the next tap elsewhere, so a Button or a Chip keeps its hover fill. Every hover style goes behind `pointer.canHover` (`@media (hover: hover) and (pointer: fine)`) from `@tuja/ui/breakpoints.stylex`. It lives beside `breakpoints` because the breakpoints Babel plugin inlines both, and an inlined media query is what StyleX ranks as one. The `@tuja/require-hover-media` ESLint rule enforces this for every key that contains `:hover`, including `:not(:hover)` and `stylex.when.*(":hover")`.

```tsx
import { pointer } from "@tuja/ui/breakpoints.stylex";

const styles = stylex.create({
  // Feedback: wrap the hover value. Touch keeps the rest state.
  row: {
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  // Several hover keys on one property, or a chained key such as
  // `:disabled:hover` (which takes no nested value): one branch for all.
  chip: {
    backgroundColor: {
      default: color.bgSurface,
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgControlHover,
        ":disabled:hover": color.bgSurface,
      },
    },
  },
  // A reveal: touch cannot hover, so it gets the full state as the default,
  // and only a device that can hover holds it back.
  indicator: {
    opacity: {
      default: 1,
      [pointer.canHover]: { default: 0, ":hover": 1 },
    },
  },
});
```

Two StyleX details:

- **A gated hover outranks `:active` and `:focus`.** StyleX ranks a media query above every pseudo-class, so a bare `:active` in the same property loses to the gated hover. Gate the press too: `":active": { default: pressed, [pointer.canHover]: pressed }`. The rule reports this. (`:focus-visible` and `:focus-within` already rank below `:hover` in StyleX.)
- **Do not put the branch beside another `@media` key.** StyleX makes sibling media queries exclude each other, so a `[breakpoints.md]` value beside a `[pointer.canHover]` branch stops applying on a device that can hover. Wrap the hover value instead, or repeat the sibling keys inside the branch.

`pointerConstants.NON_TOUCH_DEVICE` from `@tuja/ui/primitives/layout.stylex` is stricter: it also excludes every device that has a touch pointer at all. Use it only for an affordance that a touch device replaces, such as the scroll buttons of `ScrollMask`.

## Design Primitives

Composable multi-property styles in `packages/ui/src/primitives/`. Each primitive bundles 2+ CSS properties that encode a common pattern. For full API tables, read `references/primitives.md`.

### Flex (`@tuja/ui/primitives/flex.stylex`)

The most commonly used primitives. Flex patterns set `display: flex` plus layout defaults:

- `flex.row` — horizontal, vertically centered
- `flex.col` — vertical stack
- `flex.center` — centered both axes
- `flex.between` — space-between with vertical centering
- `flex.wrap` — wrapping row
- `flex.inlineCenter` — inline-flex centered

Override defaults with **modifiers**: `align.{start,center,end,baseline,stretch}`, `justify.{start,center,end,between}`, `grow.{_0,_1}`, `shrink.{_0,_1}`.

```tsx
import { flex, align, justify } from "@tuja/ui/primitives/flex.stylex";

<div css={flex.row}>                        {/* basic row */}
<div css={[flex.row, align.end]}>           {/* row, bottom-aligned */}
<header css={flex.between}>                 {/* toolbar pattern */}
<div css={[flex.col, justify.center]}>      {/* vertically centered column */}
```

### Corner (`@tuja/ui/primitives/corner.stylex`)

Pairs each `border.radius_*` step with its corner shape in one declaration — squircle on `corner.radius_1` … `corner.radius_5`, circular caps on `corner.radius_round` (clamped into a pill or a circle, a superellipse cap reads as neither). `corner.squircle_round` keeps the squircle shape at that same full-round radius, closing at half the `cornerTokens.height` dial — the shape `Button` and `SegmentedControl` use, each overriding the dial to their own control height. Rounded corners always go through this primitive; never write a bare `borderRadius`.

```tsx
import { corner } from "@tuja/ui/primitives/corner.stylex";

<div css={corner.radius_3}>           {/* card corner */}
<span css={corner.radius_round}>      {/* pill / avatar */}
<button css={corner.squircle_round}>  {/* squircle pill, dialed via cornerTokens.height */}
```

If a radius genuinely can't go through the primitive — a vendor pseudo-element, a CSS-var-driven radius — pair `cornerShape` beside `borderRadius` in the same object literal instead (`"squircle"`, or `"round"` at the full-round radius). The `@tuja/require-corner-shape` ESLint rule enforces this in `packages/ui` and `apps/web`.

There is no global `corner-shape` rule anywhere — every rounded corner carries its own shape through the primitive or a local `cornerShape` pairing.

### Material (`@tuja/ui/primitives/texture.stylex`, `@tuja/ui/primitives/wash.stylex`)

Faint surface treatments — Texture, Wash, and Glass; the rules are on the texture and wash showcases (`apps/web/src/design-system/sections/foundations/texture-showcase.tsx`, `wash-showcase.tsx`). `texture.dot` draws one dot of 1px or less, repeated across a surface at one size — never nest a textured surface inside another, and never mix two sizes in one group. `wash.toBottom`/`toTop`/`toRight`/`toLeft` are a gradient of one tone fading to transparent — a Wash has no bright spot; a bright spot reads as a light source, and only Glass is lit.

Each dials its default through a token, overridden in a local `stylex.create` the way `cornerTokens.height` is:

```tsx
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({ wide: { [textureTokens.pitch]: space._4 } });

<div css={[texture.dot, styles.wide]}>  {/* wider pitch for a wide surface */}
```

`textureTokens.pitch`/`.ink` default to `space._1`/`color.fg` at 20%; `washTokens.tone` defaults to `color.bgNeutralSubtle`.

Glass is the third Material but ships as a component style object, not a primitive: `glassSurface` from `@tuja/ui/components/glass-surface.stylex`, composed onto an element with `position: relative` plus a `corner.*` preset. `glassTokens` (`fill`, `border`, `highlight`, `blur`) is its dial, overridden the same way.

### Type role (`@tuja/ui/primitives/type.stylex`)

Text takes its size from a type role, which sets the size, line height, weight and tracking together. Copy goes through `Text` (`look`: body, bodySmall, label, caption, overline) and `Heading` (`look`: display, h1–h4) first; when you style text yourself, compose a role **first** in the `css` array, so a later style can still change the weight:

```tsx
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";

<span css={[typeRole.label, styles.navItem]}>Overview</span>
<span css={[typeRole.h1, typeModifier.numeric]}>4.8</span>
```

Roles: `display`, `subDisplay`, `h1`–`h4`, `body`, `bodySmall`, `label`, `caption`, `overline` (uppercase), `control`, `controlCaption` (text inside a control; they step down at `md` with `controlSize`), `fluidDisplay`, `fluidH1`–`fluidH3`, `fluidLead` (a landing page, growing with the viewport), `cardTitle` (grows with its `inline-size` container). `typeModifier.numeric` sets tabular figures.

Never write `fontSize` in a style — not a `font.ui*` token, not a raw length. The one exceptions are `"inherit"`, and a `controlSize.*` token for a glyph sized to a control. The weight is the property a callsite may change, with a `font.weight_*` token; leading and tracking take `font.*` tokens, never raw values. The `@tuja/require-type-role` ESLint rule enforces this in `packages/ui` and the apps.

### Other Primitives (see `references/primitives.md`)

- **Layout** — position fills, scroll containers, truncation, image fit
- **Reset** — `buttonReset.base` strips browser button chrome and carries the focus ring
- **Root** — `root.html` / `root.body`, the document defaults: colour scheme, canvas, and the text everything inherits (colour, typeface, `font.lineHeight_4`, `text-wrap: pretty`). Text needs no `lineHeight` or `textWrap: "pretty"` unless it differs, and nothing sets a `fontSize` on the root
- **Motion** — transition/animation presets with reduced-motion handling
- **A11y** — `srOnly` visually hides text while keeping it announced; `focusRing`/`focusRingInset`/`focusRingWithin` paint the keyboard focus ring. Every element that takes focus draws it: start a hand-built `<button>` from `buttonReset.base`, which already carries it, and compose `a11y.focusRing` on any other focusable element (a link, a native input, a scroller). Never remove the outline

## Best Practices

1. **Primitives for multi-property patterns** — flex, fills, truncation, resets, transitions
2. **Tokens for single properties** — `padding: space._3`, `color: color.fgMuted`
3. **Text takes a type role** — `Text`/`Heading`, or `typeRole.*` composed first; never a bare `fontSize`, and figures through `typeModifier.numeric`
4. **Gaps name the relationship** — `rhythm.inline` / `tight` / `item` / `group` / `section`, or `stack.*` / `cluster.*` / `row.*`; never a `space.*` step or a raw length for a gap or a margin between siblings
5. **Rounded corners via `corner.*`, never a bare `borderRadius`** — pair `cornerShape` locally only where the primitive can't reach
6. **Line length from the Measure** — a `<Text>` paragraph (`as="p"` at `body`/`bodySmall`) already stops at `measure.prose`; any other prose takes `measure.prose` or `measure.short`, never a raw `ch` cap (the `@tuja/require-measure` rule refuses one). Opt a paragraph out with `css` carrying `maxInlineSize: "none"`
7. **Always use the `css` prop** — never `{...stylex.props()}`
8. **Conditional styles via arrays** — `css={[base, condition && conditional]}`
9. **Mobile-first** — use breakpoint overrides for larger screens
10. **Theme-aware colors** — use `color` tokens that adapt to light/dark
11. **Logical properties** — prefer `paddingBlock`/`paddingInline` over directional
12. **Pseudo-selectors as object keys** — `{ default: val, ":focus-visible": focusVal }`
13. **Hover only where a pointer can hover** — every `:hover` behind `pointer.canHover`; a reveal gives touch the full state
14. **Every focusable element draws the focus ring** — `buttonReset.base` for a hand-built button, `a11y.focusRing` for anything else; never `outline: none`
