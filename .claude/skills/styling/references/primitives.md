# Design Primitives — Full API Reference

Multi-property composable styles in `packages/ui/src/primitives/`. Each primitive combines 2+ CSS properties that encode a common pattern. Import directly from individual files: the paths below are the `@tuja/ui` package exports, and inside `packages/ui` the same files are imported by relative path.

## Table of Contents

- [Flex Layouts](#flex-layouts)
- [Stack](#stack)
- [Corner](#corner)
- [Layout Patterns](#layout-patterns)
- [Resets](#resets)
- [Motion](#motion)
- [Accessibility](#accessibility)
- [Material (Texture, Wash)](#material-texture-wash)

---

## Flex Layouts

**Import**: `@tuja/ui/primitives/flex.stylex`

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
import { flex, align, justify, grow } from "@tuja/ui/primitives/flex.stylex";

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

## Stack

**Import**: `@tuja/ui/primitives/stack.stylex`

A container that owns the space between its children at one `rhythm` step. Prefer it to `flex.col` / `flex.wrap` / `flex.row` plus a local gap; compose a modifier after it (`[stack.tight, align.center]`) for the one property that differs.

| Export           | Properties                                                  |
| ---------------- | ----------------------------------------------------------- |
| `stack.tight`    | flex column + gap: `rhythm.tight`                           |
| `stack.item`     | flex column + gap: `rhythm.item`                            |
| `stack.group`    | flex column + gap: `rhythm.group`                           |
| `stack.section`  | flex column + gap: `rhythm.section`                         |
| `cluster.inline` | flex row + wrap + alignItems: center + gap: `rhythm.inline` |
| `cluster.tight`  | flex row + wrap + alignItems: center + gap: `rhythm.tight`  |
| `cluster.item`   | flex row + wrap + alignItems: center + gap: `rhythm.item`   |
| `row.inline`     | flex row + alignItems: center + gap: `rhythm.inline`        |
| `row.tight`      | flex row + alignItems: center + gap: `rhythm.tight`         |
| `row.item`       | flex row + alignItems: center + gap: `rhythm.item`          |

`cluster.*` and `row.*` set `flexDirection: row`, so they win over a stack they are composed after. `Card` is a `stack.item`.

```tsx
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";

<section css={stack.group}>
  <header css={stack.tight}>
    <h3>Tonight</h3>
    <p>Two films.</p>
  </header>
  <div css={cluster.tight}>{actions}</div>
  <span css={row.inline}>
    <ClockIcon /> 2h 44m
  </span>
</section>;
```

---

## Corner

**Import**: `@tuja/ui/primitives/corner.stylex`

Pairs a `border.radius_*` step with its corner shape in one declaration — squircle on the fixed steps, circular caps on `radius_round` (clamped into a pill or a circle, a superellipse cap reads as neither). Never write a bare `borderRadius` — use the matching member here instead. Where a radius genuinely can't go through the primitive (a vendor pseudo-element, a CSS-var-driven radius), pair `cornerShape` beside `borderRadius` in the same object literal (`"squircle"`, or `"round"` at the full-round radius); the `@tuja/require-corner-shape` ESLint rule enforces this in `packages/ui` and `apps/web`.

| Export                  | Properties                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `corner.radius_1`       | borderRadius: `border.radius_1` + cornerShape: squircle                                            |
| `corner.radius_2`       | borderRadius: `border.radius_2` + cornerShape: squircle                                            |
| `corner.radius_3`       | borderRadius: `border.radius_3` + cornerShape: squircle                                            |
| `corner.radius_4`       | borderRadius: `border.radius_4` + cornerShape: squircle                                            |
| `corner.radius_5`       | borderRadius: `border.radius_5` + cornerShape: squircle                                            |
| `corner.radius_round`   | borderRadius: `border.radius_round` + cornerShape: round                                           |
| `corner.squircle_round` | borderRadius: `border.radius_round`, closing at half `cornerTokens.height` + cornerShape: squircle |

`cornerTokens.height` (default `controlSize._9`) is the dial for `squircle_round` — the control height it closes the radius at. `Button` and `SegmentedControl` each set it to their own height in a local `stylex.create`, the same way `textureTokens.pitch` is overridden.

### Example

```tsx
import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";

// Card corner
<div css={corner.radius_3}>

// Pill / avatar
<span css={corner.radius_round}>

// Squircle pill dialed to this control's height
const styles = stylex.create({ track: { [cornerTokens.height]: controlSize._7 } });
<div css={[corner.squircle_round, styles.track]}>
```

There is no global `corner-shape` rule.

---

## Layout Patterns

**Import**: `@tuja/ui/primitives/layout.stylex`

| Export                  | Properties                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `absoluteFill.all`      | position: absolute + top/right/bottom/left: 0                                                                         |
| `absoluteFill.x`        | position: absolute + left: 0 + right: 0                                                                               |
| `absoluteFill.y`        | position: absolute + top: 0 + bottom: 0                                                                               |
| `viewportAnchor.fixed`  | position: fixed + inset-block/inline-start: 0 + 0 × 0 size (containing block for overlays that bring their own size)  |
| `viewportFill.absolute` | position: absolute + start insets: 0 + end insets: auto + 100vw × 100dvh (one viewport-sized layer inside the anchor) |
| `scrollX.base`          | overflowX: auto + scrollbarWidth: none                                                                                |
| `scrollY.base`          | overflowY: auto                                                                                                       |
| `truncate.base`         | overflow: hidden + textOverflow: ellipsis + whiteSpace: nowrap                                                        |
| `imageCover.base`       | objectFit: cover + width: 100% + height: 100%                                                                         |
| `imageContain.base`     | objectFit: contain + width: 100% + height: 100%                                                                       |

### Examples

```tsx
import { absoluteFill, scrollY, truncate, imageCover } from "@tuja/ui/primitives/layout.stylex";

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

**Import**: `@tuja/ui/primitives/reset.stylex`

| Export             | Properties                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `buttonReset.base` | appearance: none + borderWidth: 0 + borderStyle: none + backgroundColor: transparent + padding: 0 + cursor: pointer |

### Example

```tsx
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";

<button
  css={[buttonReset.base, flex.center, styles.iconButton]}
  onClick={onClick}
>
  {icon}
</button>;
```

---

## Motion

**Import**: `@tuja/ui/primitives/motion.stylex`

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

- `duration` — `{ _75, _100, _150, _200, _300, _400, _500, _700, _800, _1000, _1400, _1600, _2000 }` (ms strings)
- `easing` — `{ linear, ease, easeIn, easeOut, easeInOut, entrance, spring, springFallback, pulse }`
- `motionConstants.REDUCED_MOTION` — media query string (defined via `stylex.defineConsts`, works cross-module as computed keys in `stylex.create`)

### Custom Transition Example

```tsx
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";

const styles = stylex.create({
  animated: {
    transition: {
      default: `transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
```

---

## Accessibility

**Import**: `@tuja/ui/primitives/a11y.stylex`

| Export                | Properties                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `a11y.srOnly`         | Visually hidden, still announced — the canonical "visually hidden" clip recipe             |
| `a11y.focusRing`      | Keyboard focus ring, outward, on `:focus-visible`                                          |
| `a11y.focusRingInset` | Same ring pulled inside the box, for an ancestor (e.g. a rounded card) that clips overflow |

### Example

```tsx
import { a11y } from "@tuja/ui/primitives/a11y.stylex";

// Visible to screen readers only
<span css={a11y.srOnly}>Loading</span>

// Keyboard focus ring
<button css={[buttonReset.base, a11y.focusRing]}>
```

---

## Material (Texture, Wash)

**Import**: `@tuja/ui/primitives/texture.stylex`, `@tuja/ui/primitives/wash.stylex`

Texture and Wash are the two Material primitives; Glass is the third but ships as a component style object (`glassSurface`), not a primitive — see below. The rules are on the texture and wash showcases (`apps/web/src/design-system/sections/foundations/texture-showcase.tsx`, `wash-showcase.tsx`).

| Export                                           | Properties                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `texture.dot`                                    | One drawn dot (≤1px), repeated at `textureTokens.pitch`, coloured `textureTokens.ink` |
| `wash.toBottom` / `toTop` / `toRight` / `toLeft` | A linear gradient of `washTokens.tone` fading to transparent, in the named direction  |

A Texture is one mark at one size — never nest a textured surface inside another, and never mix two sizes in one group. A Wash has no bright spot anywhere; a bright spot reads as a light source, and only Glass is lit.

Each dials its default through a token, overridden in a local `stylex.create` the same way `cornerTokens.height` is:

```tsx
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  wide: { [textureTokens.pitch]: space._4 },
});

<div css={[texture.dot, styles.wide]}>
```

`textureTokens.pitch` (default `space._1`) sets the gap between marks, `textureTokens.ink` (default `color.fg` at 20%) the mark's colour. `washTokens.tone` (default `color.bgNeutralSubtle`) sets the drifting tone.

Glass is `glassSurface` from `@tuja/ui/components/glass-surface.stylex` — a translucent, lit surface composed onto an element with `position: relative` plus a `corner.*` preset; the rim inherits that radius and shape. `glassTokens` (`fill`, `border`, `highlight`, `blur`) is its dial, overridden in a local `stylex.create` the same way `cornerTokens.height` is.
