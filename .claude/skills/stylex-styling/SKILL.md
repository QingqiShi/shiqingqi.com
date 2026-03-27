---
name: stylex-styling
description: StyleX styling patterns using design tokens, breakpoints, primitives, and custom css prop. Use when working with styles, CSS, design tokens, breakpoints, responsive design, themes, styling components, css prop, stylex.create, primitives, utility styles, flex, spacing, or when the user mentions StyleX, tokens.stylex, controlSize, color tokens, breakpoints, or primitives.
---

# StyleX Styling

## Overview

This project uses StyleX for styling with design tokens, responsive breakpoints, theme-aware colors, and composable design primitives.

## Design Primitives

Pre-built composable utility styles in `src/primitives/`. Import directly from individual files (e.g., `#src/primitives/flex.stylex.ts`) and compose via the `css` prop.

### Available Primitives

| Import       | Values                                                                         | CSS Property             |
| ------------ | ------------------------------------------------------------------------------ | ------------------------ |
| `flex`       | `row`, `col`, `wrap`, `inline`                                                 | display + flexDirection  |
| `align`      | `start`, `center`, `end`, `baseline`, `stretch`                                | alignItems               |
| `justify`    | `start`, `center`, `end`, `between`                                            | justifyContent           |
| `grow`       | `_0`, `_1`                                                                     | flexGrow                 |
| `shrink`     | `_0`, `_1`                                                                     | flexShrink               |
| `grid`       | `base`, `inline`                                                               | display: grid            |
| `place`      | `center`, `start`                                                              | placeItems               |
| `gap`        | `_none`, `_00`–`_8`                                                            | gap                      |
| `p`          | `_none`, `_00`–`_8`                                                            | padding                  |
| `pb`         | `_none`, `_00`–`_8`                                                            | paddingBlock             |
| `pi`         | `_none`, `_00`–`_8`                                                            | paddingInline            |
| `m`          | `_none`, `_00`–`_8`                                                            | margin                   |
| `mb`         | `_none`, `_00`–`_8`                                                            | marginBlock              |
| `mi`         | `_none`, `_00`–`_8`                                                            | marginInline             |
| `text`       | `display`, `subDisplay`, `heading1`–`3`, `uiHeading1`–`3`, `body`, `bodySmall` | fontSize                 |
| `weight`     | `_1`–`_9`                                                                      | fontWeight               |
| `leading`    | `_00`–`_5`                                                                     | lineHeight               |
| `textColor`  | `main`, `muted`, `onActive`                                                    | color                    |
| `bg`         | `main`, `raised`, `hover`, `translucent`, `transparent`                        | backgroundColor          |
| `rounded`    | `none`, `_1`–`_5`, `round`                                                     | borderRadius             |
| `elevation`  | `none`, `_1`–`_6`                                                              | boxShadow                |
| `position`   | `relative`, `absolute`, `fixed`, `sticky`                                      | position                 |
| `overflow`   | `hidden`, `auto`, `visible`                                                    | overflow                 |
| `z`          | `background`, `base`, `content`, `overlay`, `header`, `tooltip`, `toaster`     | zIndex                   |
| `size`       | `full`, `fullWidth`, `fullHeight`                                              | width/height             |
| `inset`      | `_0`                                                                           | top/right/bottom/left: 0 |
| `pointer`    | `none`, `all`                                                                  | pointerEvents            |
| `transition` | `none`, `all`, `colors`, `opacity`, `shadow`, `transform`                      | transition               |
| `animate`    | `fadeIn`, `fadeOut`, `slideUp`, `slideDown`, `pulse`, `bounce`                 | animation                |

### Motion Constants

Exported from `#src/primitives/*.stylex.ts` for building custom transitions:

- `REDUCED_MOTION` — `"@media (prefers-reduced-motion: reduce)"` media query string
- `duration` — `{ _75, _100, _150, _200, _300, _500, _700, _1000 }` (ms strings)
- `easing` — `{ linear, ease, easeIn, easeOut, easeInOut, entrance }` (CSS timing functions)

### When to Use Primitives vs Component Styles

- **Use primitives** for common patterns: flex layout, spacing, text styling, backgrounds, positioning
- **Use component `stylex.create`** for: responsive breakpoint overrides, pseudo-selectors (`:hover`), complex/one-off styles, component-specific values
- **Mix both** — compose primitives with component styles in the same `css` array

### Example: Before and After

**Before** (verbose component styles):

```tsx
import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "#src/tokens.stylex.ts";

<header css={styles.container}>
  <h2 css={styles.subtitle}>{title}</h2>
  <h1 css={styles.title}>{role}</h1>
  <time css={styles.date}>{date}</time>
</header>;

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBottom: space._8,
  },
  subtitle: {
    fontSize: font.vpHeading3,
    fontWeight: font.weight_7,
    color: color.textMuted,
    margin: 0,
  },
  title: {
    fontSize: font.vpHeading1,
    margin: 0,
  },
  date: {
    display: "block",
    fontSize: font.uiBody,
    color: color.textMuted,
  },
});
```

**After** (with primitives):

```tsx
import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { gap, m } from "#src/primitives/spacing.stylex.ts";
import { text, textColor, weight } from "#src/primitives/text.stylex.ts";
import { space } from "#src/tokens.stylex.ts";

<header css={[flex.col, gap._1, styles.container]}>
  <h2 css={[text.heading3, weight._7, textColor.muted, m._none]}>{title}</h2>
  <h1 css={[text.heading1, m._none]}>{role}</h1>
  <time css={[text.body, textColor.muted, styles.date]}>{date}</time>
</header>;

const styles = stylex.create({
  container: { paddingBottom: space._8 },
  date: { display: "block" },
});
```

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

1. **Use primitives for common patterns** - flex layout, spacing, text, backgrounds, positioning
2. **Always use design tokens** - Never hardcode colors, spacing, or font values
3. **Use the css prop** - Don't use `{...stylex.props()}` directly
4. **Conditional styles with arrays** - `css={[base, condition && conditional]}`
5. **Responsive by default** - Consider mobile-first with breakpoint overrides
6. **Theme-aware colors** - Use color tokens that adapt to light/dark themes
7. **Pseudo-selectors in objects** - `{ default: value, ":hover": hoverValue }`
8. **Respect reduced motion** - Use `REDUCED_MOTION` from primitives for animation/transition media queries
9. **Logical properties** - Prefer `paddingBlock`/`paddingInline` over `paddingTop`/`paddingLeft`

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
  REDUCED_MOTION,
  duration,
  easing,
} from "#src/primitives/motion.stylex.ts";

const styles = stylex.create({
  animated: {
    transition: {
      default: `transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`,
      [REDUCED_MOTION]: "none",
    },
  },
});
```
