---
name: stylex-styling
description: StyleX styling patterns using design tokens, breakpoints, primitives, and custom css prop. Use when working with styles, CSS, design tokens, breakpoints, responsive design, themes, styling components, css prop, stylex.create, primitives, utility styles, flex, spacing, or when the user mentions StyleX, tokens.stylex, controlSize, color tokens, breakpoints, or primitives.
---

# StyleX Styling

## Overview

This project uses StyleX for styling with design tokens, responsive breakpoints, theme-aware colors, and composable design primitives.

## Design Primitives

Multi-property composable styles in `src/primitives/`. Each primitive combines 2+ CSS properties that encode a common pattern. Import directly from individual files.

### Flex Layouts (`#src/primitives/flex.stylex.ts`)

Common layout patterns:

| Export              | Properties                                                         |
| ------------------- | ------------------------------------------------------------------ |
| `flex.row`          | display: flex + alignItems: center                                 |
| `flex.col`          | display: flex + flexDirection: column                              |
| `flex.center`       | display: flex + alignItems: center + justifyContent: center        |
| `flex.between`      | display: flex + alignItems: center + justifyContent: space-between |
| `flex.wrap`         | display: flex + flexWrap: wrap + alignItems: center                |
| `flex.inlineCenter` | display: inline-flex + alignItems: center + justifyContent: center |

Layout modifiers (override defaults from flex primitives):

| Export    | Values                                          |
| --------- | ----------------------------------------------- |
| `align`   | `start`, `center`, `end`, `baseline`, `stretch` |
| `justify` | `start`, `center`, `end`, `between`             |
| `grow`    | `_0`, `_1`                                      |
| `shrink`  | `_0`, `_1`                                      |

```tsx
import { flex, align, justify } from "#src/primitives/flex.stylex.ts";

// Common row — vertically centered by default
<div css={flex.row}>

// Override alignment
<div css={[flex.row, align.end]}>

// Toolbar pattern
<header css={flex.between}>
```

### Layout Patterns (`#src/primitives/layout.stylex.ts`)

| Export              | Properties                                                     |
| ------------------- | -------------------------------------------------------------- |
| `absoluteFill.all`  | position: absolute + top/right/bottom/left: 0                  |
| `absoluteFill.x`    | position: absolute + left: 0 + right: 0                        |
| `absoluteFill.y`    | position: absolute + top: 0 + bottom: 0                        |
| `fixedFill.all`     | position: fixed + top/right/bottom/left: 0                     |
| `scrollX.base`      | overflowX: auto + scrollbarWidth: none                         |
| `scrollY.base`      | overflowY: auto                                                |
| `truncate.base`     | overflow: hidden + textOverflow: ellipsis + whiteSpace: nowrap |
| `imageCover.base`   | objectFit: cover + width: 100% + height: 100%                  |
| `imageContain.base` | objectFit: contain + width: 100% + height: 100%                |

### Resets (`#src/primitives/reset.stylex.ts`)

| Export             | Properties                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `buttonReset.base` | appearance: none + borderWidth: 0 + borderStyle: none + backgroundColor: transparent + padding: 0 + cursor: pointer |

### Motion (`#src/primitives/motion.stylex.ts`)

**Transition presets** (transition string + reduced-motion override):

| `transition.*` | Effect                                                 |
| -------------- | ------------------------------------------------------ |
| `none`         | transition: none                                       |
| `all`          | all 200ms ease (reduced-motion: colors + opacity only) |
| `colors`       | color + background-color + border-color                |
| `opacity`      | opacity 200ms ease                                     |
| `shadow`       | box-shadow 200ms ease                                  |
| `transform`    | transform 200ms ease (reduced-motion: none)            |

**Animation presets** (keyframes + duration + timing + iteration):

| `animate.*`             | Effect                                                |
| ----------------------- | ----------------------------------------------------- |
| `fadeIn` / `fadeOut`    | opacity transition, 200ms                             |
| `slideUp` / `slideDown` | translateY entrance, 300ms (reduced-motion: disabled) |
| `pulse`                 | opacity pulse, 2s infinite                            |
| `bounce`                | scale + opacity bounce, 1.4s infinite                 |
| `expand` / `collapse`   | grid-template-rows 0fr↔1fr, 300ms                     |

**Constants** for building custom transitions:

- `duration` — `{ _75, _100, _150, _200, _300, _500, _700, _1000 }` (ms strings)
- `easing` — `{ linear, ease, easeIn, easeOut, easeInOut, entrance }`
- `motionConstants.REDUCED_MOTION` — media query string (defined via `stylex.defineConsts`, works cross-module as computed keys in `stylex.create`)

### When to Use Primitives vs Component Styles

- **Use primitives** for multi-property patterns: flex layouts, fills, truncation, resets, transitions
- **Use layout modifiers** to override primitive defaults: `css={[flex.row, align.end]}`
- **Use `stylex.create`** for: single-property styling (colors, spacing, typography, borders), responsive breakpoints, pseudo-selectors, component-specific values

## Key Patterns

### Design Tokens

- **Import tokens from**: `#src/tokens.stylex.ts`
- **Available token categories**:
  - `color` - Theme-aware colors (textMain, backgroundRaised, controlActive, etc.)
  - `space` - Spacing scale (\_00 through \_16, 0.1rem to 35rem)
  - `controlSize` - Responsive component sizing (\_0 through \_9)
  - `font` - Typography (family, weight_1-9, lineHeight_00-5, uiHeading1-3, uiBody, uiBodySmall, vpDisplay, vpHeading1-3)
  - `border` - Sizes (size_1-5) and radii (radius_1-5, radius_round)
  - `shadow` - 6 elevation levels (\_1 through \_6)
  - `layer` - Z-index scale (background, base, content, overlay, header, tooltip, toaster)
  - `ratio` - Aspect ratios (square, golden, tv, double, wide, poster, portrait)

### Breakpoints

- **Import from**: `#src/breakpoints.stylex.ts`
- **Values**: `sm` (320px), `md` (768px), `lg` (1080px), `xl` (2000px)
- **Usage**: `{ default: value, [breakpoints.md]: largeScreenValue }`

### Custom CSS Prop

- Use `css={styles.someStyle}` prop instead of `{...stylex.props(styles.someStyle)}`
- Transpiled by custom Babel plugin
- Supports arrays: `css={[styles.base, isActive && styles.active]}`

## Best Practices

1. **Use primitives for multi-property patterns** — flex layouts, fills, truncation, resets
2. **Use design tokens for single properties** — `fontSize: font.uiBody`, `gap: space._3`, `borderRadius: border.radius_2`
3. **Use the css prop** — Don't use `{...stylex.props()}` directly
4. **Conditional styles with arrays** — `css={[base, condition && conditional]}`
5. **Responsive by default** — Consider mobile-first with breakpoint overrides
6. **Theme-aware colors** — Use color tokens that adapt to light/dark themes
7. **Pseudo-selectors in objects** — `{ default: value, ":hover": hoverValue }`
8. **Logical properties** — Prefer `paddingBlock`/`paddingInline` over `paddingTop`/`paddingLeft`

## Common Patterns

### Responsive Display

```tsx
display: { default: "none", [breakpoints.md]: "flex" }
```

### Conditional Styles

```tsx
css={[styles.base, isActive && styles.active, hasError && styles.error]}
```

### Hover States

```tsx
backgroundColor: {
  default: color.backgroundRaised,
  ":hover": color.backgroundHover,
}
```

### Custom Transition with Motion Constants

```tsx
import {
  duration,
  easing,
  motionConstants,
} from "#src/primitives/motion.stylex.ts";

const styles = stylex.create({
  animated: {
    transition: {
      default: `transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
```
