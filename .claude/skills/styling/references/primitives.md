# Design Primitives — Full API Reference

Multi-property composable styles in `src/primitives/`. Each primitive combines 2+ CSS properties that encode a common pattern. Import directly from individual files.

## Table of Contents

- [Flex Layouts](#flex-layouts)
- [Corner](#corner)
- [Layout Patterns](#layout-patterns)
- [Resets](#resets)
- [Motion](#motion)

---

## Flex Layouts

**Import**: `#src/primitives/flex.stylex.ts`

### Flex Patterns

| Export              | Properties                                                         |
| ------------------- | ------------------------------------------------------------------ |
| `flex.row`          | display: flex + alignItems: center                                 |
| `flex.col`          | display: flex + flexDirection: column                              |
| `flex.center`       | display: flex + alignItems: center + justifyContent: center        |
| `flex.between`      | display: flex + alignItems: center + justifyContent: space-between |
| `flex.wrap`         | display: flex + flexWrap: wrap + alignItems: center                |
| `flex.inlineCenter` | display: inline-flex + alignItems: center + justifyContent: center |

### Layout Modifiers

Override defaults from flex primitives:

| Export    | Values                                          |
| --------- | ----------------------------------------------- |
| `align`   | `start`, `center`, `end`, `baseline`, `stretch` |
| `justify` | `start`, `center`, `end`, `between`             |
| `grow`    | `_0`, `_1`                                      |
| `shrink`  | `_0`, `_1`                                      |

### Examples

```tsx
import { flex, align, justify, grow } from "#src/primitives/flex.stylex.ts";

// Common row — vertically centered by default
<div css={flex.row}>

// Override alignment
<div css={[flex.row, align.end]}>

// Toolbar: items spaced, vertically centered
<header css={flex.between}>

// Column with centered content
<div css={[flex.col, justify.center]}>

// Wrapping chip row
<div css={flex.wrap}>

// Fill remaining space
<div css={[flex.row, grow._1]}>
```

---

## Corner

**Import**: `#src/primitives/corner.stylex.ts`

Pairs a `border.radius_*` step with `cornerShape: "squircle"` in one declaration. Never write a bare `borderRadius` — use the matching member here instead. Where a radius genuinely can't go through the primitive (a vendor pseudo-element, a CSS-var-driven radius), pair `cornerShape: "squircle"` beside `borderRadius` in the same object literal; `packages/ui` enforces this with a Vitest test that scans for unpaired radius properties.

| Export                | Properties                                                  |
| --------------------- | ----------------------------------------------------------- |
| `corner.radius_1`     | borderRadius: `border.radius_1` + cornerShape: squircle     |
| `corner.radius_2`     | borderRadius: `border.radius_2` + cornerShape: squircle     |
| `corner.radius_3`     | borderRadius: `border.radius_3` + cornerShape: squircle     |
| `corner.radius_4`     | borderRadius: `border.radius_4` + cornerShape: squircle     |
| `corner.radius_5`     | borderRadius: `border.radius_5` + cornerShape: squircle     |
| `corner.radius_round` | borderRadius: `border.radius_round` + cornerShape: squircle |

### Example

```tsx
import { corner } from "#src/primitives/corner.stylex.ts";

// Card corner
<div css={corner.radius_3}>

// Pill / avatar
<span css={corner.radius_round}>
```

`apps/web` composes the same primitive via `@tuja/ui/primitives/corner.stylex`; there is no global `corner-shape` rule.

---

## Layout Patterns

**Import**: `#src/primitives/layout.stylex.ts`

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

### Examples

```tsx
import { absoluteFill, scrollY, truncate, imageCover } from "#src/primitives/layout.stylex.ts";

// Overlay covering parent
<div css={absoluteFill.all}>

// Scrollable content area
<div css={scrollY.base}>

// Truncated text
<span css={truncate.base}>

// Cover image
<img css={imageCover.base} src={url} alt={alt} />
```

---

## Resets

**Import**: `#src/primitives/reset.stylex.ts`

| Export             | Properties                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `buttonReset.base` | appearance: none + borderWidth: 0 + borderStyle: none + backgroundColor: transparent + padding: 0 + cursor: pointer |

### Example

```tsx
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";

<button
  css={[buttonReset.base, flex.center, styles.iconButton]}
  onClick={onClick}
>
  {icon}
</button>;
```

---

## Motion

**Import**: `#src/primitives/motion.stylex.ts`

### Transition Presets

Each includes a reduced-motion override automatically.

| `transition.*` | Effect                                                 |
| -------------- | ------------------------------------------------------ |
| `none`         | transition: none                                       |
| `all`          | all 200ms ease (reduced-motion: colors + opacity only) |
| `colors`       | color + background-color + border-color                |
| `opacity`      | opacity 200ms ease                                     |
| `shadow`       | box-shadow 200ms ease                                  |
| `transform`    | transform 200ms ease (reduced-motion: none)            |

### Animation Presets

| `animate.*`             | Effect                                                |
| ----------------------- | ----------------------------------------------------- |
| `fadeIn` / `fadeOut`    | opacity transition, 200ms                             |
| `slideUp` / `slideDown` | translateY entrance, 300ms (reduced-motion: disabled) |
| `pulse`                 | opacity pulse, 2s infinite                            |
| `bounce`                | scale + opacity bounce, 1.4s infinite                 |
| `expand` / `collapse`   | grid-template-rows 0fr/1fr, 300ms                     |

### Constants

For building custom transitions:

- `duration` — `{ _75, _100, _150, _200, _300, _500, _700, _1000 }` (ms strings)
- `easing` — `{ linear, ease, easeIn, easeOut, easeInOut, entrance }`
- `motionConstants.REDUCED_MOTION` — media query string (defined via `stylex.defineConsts`, works cross-module as computed keys in `stylex.create`)

### Custom Transition Example

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
