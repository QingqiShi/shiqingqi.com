# Design Primitives — Full API Reference

Multi-property composable styles in `packages/ui/src/primitives/`. Each primitive combines 2+ CSS properties that encode a common pattern. Import directly from individual files: the paths below are the `@tuja/ui` package exports, and inside `packages/ui` the same files are imported by relative path.

## Table of Contents

- [Flex Layouts](#flex-layouts)
- [Stack](#stack)
- [Type Role](#type-role)
- [Corner](#corner)
- [Layout Patterns](#layout-patterns)
- [Resets](#resets)
- [Root](#root)
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

## Type Role

**Import**: `@tuja/ui/primitives/type.stylex`

The job a piece of text does. Each role sets `fontSize`, `lineHeight`, `fontWeight` and `letterSpacing` together. Compose it first, so a later style can change the weight with a `font.weight_*` token. `Text` and `Heading` take the same roles as their `look`.

| Export                    | Size                    | Leading | Weight | Tracking               |
| ------------------------- | ----------------------- | ------- | ------ | ---------------------- |
| `typeRole.display`        | `font.uiDisplay`        | 1.1     | 800    | tight                  |
| `typeRole.subDisplay`     | `font.uiSubDisplay`     | 1.1     | 800    | tight                  |
| `typeRole.h1`             | `font.uiHeading1`       | 1.2     | 800    | snug                   |
| `typeRole.h2`             | `font.uiHeading2`       | 1.2     | 700    | normal                 |
| `typeRole.h3`             | `font.uiHeading3`       | 1.2     | 700    | normal                 |
| `typeRole.h4`             | `font.uiBody`           | 1.3     | 700    | normal                 |
| `typeRole.body`           | `font.uiBody`           | 1.5     | 400    | normal                 |
| `typeRole.bodySmall`      | `font.uiBodySmall`      | 1.5     | 400    | normal                 |
| `typeRole.label`          | `font.uiBodySmall`      | 1.3     | 500    | normal                 |
| `typeRole.caption`        | `font.uiCaption`        | 1.3     | 400    | normal                 |
| `typeRole.overline`       | `font.uiOverline`       | 1.3     | 600    | widest + uppercase     |
| `typeRole.control`        | `font.uiControl`        | 1.3     | 500    | normal                 |
| `typeRole.controlCaption` | `font.uiControlCaption` | 1.3     | 400    | normal                 |
| `typeRole.fluidDisplay`   | `font.vpDisplay`        | 1.1     | 800    | tight                  |
| `typeRole.fluidH1`        | `font.vpHeading1`       | 1.2     | 700    | normal                 |
| `typeRole.fluidH2`        | `font.vpHeading2`       | 1.2     | 700    | normal                 |
| `typeRole.fluidH3`        | `font.vpHeading3`       | 1.3     | 700    | normal                 |
| `typeRole.fluidLead`      | `font.vpSubDisplay`     | 1.5     | 400    | normal                 |
| `typeRole.cardTitle`      | `font.cqTitle`          | 1.2     | 700    | normal                 |
| `typeModifier.numeric`    | —                       | —       | —      | `tabular-nums` figures |

`control` and `controlCaption` step down at `md` together with `controlSize`. The `fluid*` roles are for a landing page and grow with the viewport. `cardTitle` grows with the nearest `inline-size` container, so put it inside one.

```tsx
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";

<header css={stack.tight}>
  <h3 css={typeRole.h3}>Tonight</h3>
  <span css={[typeRole.caption, typeModifier.numeric, styles.meta]}>
    2h 44m
  </span>
</header>;
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
| `scrollbar.autoHide`    | thin scrollbar, transparent at rest and shown on hover or focus, on `NON_TOUCH_DEVICE` only                           |

`pointerConstants.NON_TOUCH_DEVICE` (`@media (hover: hover) and (not (any-pointer: coarse))`) gates an affordance that a touch device replaces. A hover style takes `pointer.canHover` from `@tuja/ui/breakpoints.stylex` instead; see the Hover section of `SKILL.md`.

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

| Export             | Properties                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `buttonReset.base` | appearance: none + borderWidth: 0 + borderStyle: none + backgroundColor: transparent + padding: 0 + cursor: pointer + the `a11y.focusRing` ring |

Every hand-built `<button>` starts from `buttonReset.base`, so it has the system focus ring without a second primitive. Compose `a11y.focusRingInset` after it where an ancestor clips overflow.

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

## Root

**Import**: `@tuja/ui/primitives/root.stylex`

| Export      | Properties                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `root.html` | colorScheme: light dark + backgroundColor: `color.bgCanvas` + textSizeAdjust: 100%                 |
| `root.body` | color: `color.fg` + fontFamily: `font.family` + lineHeight: `font.lineHeight_4` + textWrap: pretty |

Goes once on the document: `root.html` on `<html>` (in apps/web, through `getDocumentClassName` in `apps/web/src/theme/global-styles.ts`, because the Theme script sets the class) and `root.body` on `<body>`. Everything inherits the body's leading and `text-wrap: pretty`, so text needs no `lineHeight` or `textWrap` of its own unless it differs. Never set a `fontSize` on the root: it overrides the visitor's browser font size, which every `rem` token follows. StyleX cannot select by tag, so `apps/web/src/app/global.css` balances raw `<h1>`–`<h6>` in the `normalize` layer; `Heading` balances by default. `apps/web/e2e/design-system-root-defaults.spec.ts` guards all of this.

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

// Keyboard focus ring on a focusable element that is not a reset button
<Link {...stylex.props(a11y.focusRing, styles.cta)} href={href}>
```

Every element that takes focus draws the system ring: a component, `buttonReset.base`, `chipSurface.interactive` and `cardSurface.interactive` carry it, and anything else (a link, a native `<input>`, a scroller) composes `a11y.focusRing`. Never set `outline: none` or `outlineWidth: 0` to hide it. A text field with no frame of its own leaves the ring to its frame: compose `a11y.focusRingWithin` on the frame and `stylex.defaultMarker()` on the field, as `chat-textarea.tsx` does. `apps/web/e2e/design-system-focus-ring.spec.ts` tabs through each page and fails on a tab stop with no ring or a clipped one.

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
