# Design Tokens — Full API Reference

All tokens are theme-aware (light/dark) and imported from `#src/tokens.stylex.ts`.

## Table of Contents

- [Color](#color)
- [Space](#space)
- [Font](#font)
- [Control Size](#control-size)
- [Border](#border)
- [Shadow](#shadow)
- [Layer](#layer)
- [Ratio](#ratio)

---

## Color

Theme-aware color tokens. Every token is a single `light-dark(<light>, <dark>)`
value that resolves against the element's `color-scheme`. No per-theme
stylesheets exist; forcing a theme just pins `color-scheme` on the root.
Palette values are not listed here because they change with retuning. See
`packages/ui/src/tokens.stylex.ts` for the current mapping.

### The grammar

Every name is `<property><subject>[<qualifier>][<state>]`:

- **property** — `fg`, `bg` or `border`. `fg` is anything drawn on a surface:
  text, icons, logos.
- **subject** — a Token Role (`canvas`, `surface`, `control`, or an Intent:
  `accent`, `info`, `success`, `warning`, `danger`, `neutral`) or a Material
  (`MaterialGlass`). `inverse` and `scrim` are treatments a surface takes, not
  Token Roles.
- **qualifier** — `subtle` is an Intent's tint; `sunken`, `raised` and `fade`
  are a surface's elevation.
- **state** — `hover`, `pressed`, `selected`, `disabled`. Bare is rest.

Five rules follow from it:

1. **Property first.** Pick the token for the property you are painting. A
   divider is a border drawn as a box.
2. **The bare form is the default.** `fg` is body text, `border` the quiet
   edge, `bgControl` a control at rest, `bgAccent` the solid accent fill.
3. **`fgOn<X>` pairs with `bg<X>`.** Paint the background and the foreground
   is already named.
4. **On a solid Intent fill use `fgOn<Intent>`; on its tint use
   `fg<Intent>`.**
5. **Neutral is the default Intent**, so its foreground and border are the
   bare `fg` and `border`.

The `color` group holds every color token of the design system.

### Foreground

| Token                     | Use                                                         |
| ------------------------- | ----------------------------------------------------------- |
| `color.fg`                | Body text, headings, icons; holds the APCA Lc 75 floor      |
| `color.fgMuted`           | Intros, supporting copy, captions, labels; APCA Lc 60 floor |
| `color.fgOnControlBright` | Foreground on `bgControlBright`                             |
| `color.fgOnInverse`       | Foreground on `bgInverse`                                   |
| `color.fgOnScrim`         | Foreground on `bgScrim`; white in both themes               |

Each Intent adds an `fg<Intent>` and an `fgOn<Intent>` — see Intents below.

### Backgrounds

#### Canvas — the app shell

| Token                | Use                                        |
| -------------------- | ------------------------------------------ |
| `color.bgCanvas`     | The page ground, behind everything else    |
| `color.bgCanvasFade` | What a gradient on the canvas fades toward |

#### Surface — cards and panels

| Token                   | Use                                                       |
| ----------------------- | --------------------------------------------------------- |
| `color.bgSurface`       | Cards, panels, dialog bodies                              |
| `color.bgSurfaceSunken` | A recessed surface — an input well                        |
| `color.bgSurfaceRaised` | A floating surface — a menu or popover, on `layer.raised` |
| `color.bgSurfaceFade`   | What a gradient on a surface fades toward                 |

#### Bright · Inverse · Scrim — the grounds with their own foreground token

| Token                   | Use                                                         |
| ----------------------- | ----------------------------------------------------------- |
| `color.bgControlBright` | Stays light in both themes — a switch or slider thumb       |
| `color.bgInverse`       | Flips the theme — tooltips, snackbars                       |
| `color.bgScrim`         | Dims the page behind a modal; the same black in both themes |

#### Control — buttons, list rows, menu items

| Token                     | Use                                                                           |
| ------------------------- | ----------------------------------------------------------------------------- |
| `color.bgControl`         | At rest                                                                       |
| `color.bgControlHover`    | While hovered                                                                 |
| `color.bgControlPressed`  | While pressed                                                                 |
| `color.bgControlSelected` | While selected                                                                |
| `color.bgControlDisabled` | Disabled; painted with `opacity.disabled`, so it never lands at full strength |

### Borders

| Token          | Use                                                     |
| -------------- | ------------------------------------------------------- |
| `color.border` | The quiet default edge, and the neutral Intent's border |

Each Intent adds one solid `border<Intent>` in its fill's own tone. There is
exactly one border level per Intent — no translucent variant.

### Intents

Six Intents, the same six tokens each, all in the `color` group
(`color.bgAccent`, `color.borderAccent`, and so on).

| Intent    | Fill        | Hover            | Tint              | Border          | Foreground  | On fill       |
| --------- | ----------- | ---------------- | ----------------- | --------------- | ----------- | ------------- |
| `neutral` | `bgNeutral` | `bgNeutralHover` | `bgNeutralSubtle` | `border`        | `fg`        | `fgOnNeutral` |
| `accent`  | `bgAccent`  | `bgAccentHover`  | `bgAccentSubtle`  | `borderAccent`  | `fgAccent`  | `fgOnAccent`  |
| `info`    | `bgInfo`    | `bgInfoHover`    | `bgInfoSubtle`    | `borderInfo`    | `fgInfo`    | `fgOnInfo`    |
| `success` | `bgSuccess` | `bgSuccessHover` | `bgSuccessSubtle` | `borderSuccess` | `fgSuccess` | `fgOnSuccess` |
| `warning` | `bgWarning` | `bgWarningHover` | `bgWarningSubtle` | `borderWarning` | `fgWarning` | `fgOnWarning` |
| `danger`  | `bgDanger`  | `bgDangerHover`  | `bgDangerSubtle`  | `borderDanger`  | `fgDanger`  | `fgOnDanger`  |

An Intent drawn as a mark at fill strength (an icon's `color`/`fill`/`stroke`)
takes `bg<Intent>`; a ring or outline takes `border<Intent>`.

### Glass — the Material's own colours

| Token                                | Use                                 |
| ------------------------------------ | ----------------------------------- |
| `color.bgMaterialGlass`              | The translucent fill over the blur  |
| `color.borderMaterialGlass`          | The hairline rim, all the way round |
| `color.borderMaterialGlassHighlight` | The light on that rim               |

`glassTokens` (`fill`, `border`, `highlight`, `blur`) in
`packages/ui/src/components/surfaces/glass-surface.stylex.ts` is Glass's own
dial and defaults to these three.

### Component Colors

A color only one component reads ships with that component, not in `color`:
`syntax` in `packages/ui/src/components/content/syntax.stylex.ts`.

### Translucency

There are no channel-triplet tokens. Derive translucent colors from a color
token with `color-mix`, e.g.
`color-mix(in srgb, ${color.bgCanvasFade} 45%, transparent)`. The `*Fade`
tokens are the colors translucent gradients blend toward.

---

## Space

Spacing scale from `0.1rem` to `35rem`.

| Token       | Value     |
| ----------- | --------- |
| `space._00` | `0.1rem`  |
| `space._0`  | `0.25rem` |
| `space._1`  | `0.5rem`  |
| `space._2`  | `0.75rem` |
| `space._3`  | `1rem`    |
| `space._4`  | `1.25rem` |
| `space._5`  | `1.5rem`  |
| `space._6`  | `1.75rem` |
| `space._7`  | `2rem`    |
| `space._8`  | `3rem`    |
| `space._9`  | `4rem`    |
| `space._10` | `5rem`    |
| `space._11` | `7.5rem`  |
| `space._12` | `10rem`   |
| `space._13` | `15rem`   |
| `space._14` | `20rem`   |
| `space._15` | `30rem`   |
| `space._16` | `35rem`   |

---

## Font

### Family

`font.family` — `Inter,Inter-fallback,sans-serif`

### Sizes — Static UI

| Token              | Value     |
| ------------------ | --------- |
| `font.uiHeading1`  | `1.5rem`  |
| `font.uiHeading2`  | `1.25rem` |
| `font.uiHeading3`  | `1.1rem`  |
| `font.uiBody`      | `1rem`    |
| `font.uiBodySmall` | `0.85rem` |

### Sizes — Viewport-Responsive

Scales across breakpoints (sm → md → lg):

| Token               | Default  | sm       | md        | lg        |
| ------------------- | -------- | -------- | --------- | --------- |
| `font.vpDisplay`    | `2rem`   | `2.8rem` | `3.75rem` | `5.25rem` |
| `font.vpSubDisplay` | `1rem`   | `1.1rem` | `1.3rem`  | `1.6rem`  |
| `font.vpHeading1`   | `1.3rem` | `1.4rem` | `1.6rem`  | `2rem`    |
| `font.vpHeading2`   | `1.2rem` | `1.3rem` | `1.5rem`  | `1.8rem`  |
| `font.vpHeading3`   | `1rem`   | `1.1rem` | `1.2rem`  | `1.3rem`  |

### Sizes — Container-Responsive

| Token          | Default                                      | lg       |
| -------------- | -------------------------------------------- | -------- |
| `font.cqTitle` | `clamp(1.1rem, 0.96rem + 1.56cqmin, 1.4rem)` | `1.5rem` |

### Weights

`font.weight_1` (100) through `font.weight_9` (900) — maps to CSS font-weight integers.

### Line Heights

| Token                | Value  |
| -------------------- | ------ |
| `font.lineHeight_00` | `0.95` |
| `font.lineHeight_0`  | `1`    |
| `font.lineHeight_1`  | `1.1`  |
| `font.lineHeight_2`  | `1.2`  |
| `font.lineHeight_3`  | `1.3`  |
| `font.lineHeight_4`  | `1.5`  |
| `font.lineHeight_5`  | `2`    |

---

## Control Size

Responsive sizing for interactive components. Larger on mobile (touch targets), smaller on desktop (md+ breakpoint).

| Token            | Mobile (default) | Desktop (md+) |
| ---------------- | ---------------- | ------------- |
| `controlSize._0` | `2.4px`          | `2px`         |
| `controlSize._1` | `4.8px`          | `4px`         |
| `controlSize._2` | `9.6px`          | `8px`         |
| `controlSize._3` | `14.4px`         | `12px`        |
| `controlSize._4` | `19.2px`         | `16px`        |
| `controlSize._5` | `24px`           | `20px`        |
| `controlSize._6` | `28.8px`         | `24px`        |
| `controlSize._7` | `33.6px`         | `28px`        |
| `controlSize._8` | `38.4px`         | `32px`        |
| `controlSize._9` | `48px`           | `40px`        |

---

## Border

### Sizes

| Token           | Value  |
| --------------- | ------ |
| `border.size_1` | `1px`  |
| `border.size_2` | `2px`  |
| `border.size_3` | `5px`  |
| `border.size_4` | `10px` |
| `border.size_5` | `25px` |

### Radii

| Token                 | Value                |
| --------------------- | -------------------- |
| `border.radius_1`     | `0.3rem`             |
| `border.radius_2`     | `0.5rem`             |
| `border.radius_3`     | `1rem`               |
| `border.radius_4`     | `2rem`               |
| `border.radius_5`     | `3rem`               |
| `border.radius_round` | `1e5px` (pill shape) |

---

## Shadow

Six elevation levels (`shadow._1` through `shadow._6`) plus `shadow.inset`. Each layer's color is a `light-dark()` HSL tint — faint in light, much stronger in dark — so shadows follow the active `color-scheme`. Higher numbers = more elevation.

---

## Layer

Z-index scale for stacking context.

| Token              | Value  |
| ------------------ | ------ |
| `layer.background` | `-100` |
| `layer.base`       | `0`    |
| `layer.content`    | `100`  |
| `layer.overlay`    | `200`  |
| `layer.header`     | `300`  |
| `layer.tooltip`    | `400`  |
| `layer.toaster`    | `500`  |

---

## Ratio

Aspect ratio tokens for use with `aspectRatio` CSS property.

| Token            | Value     |
| ---------------- | --------- |
| `ratio.square`   | `1`       |
| `ratio.golden`   | `1.618/1` |
| `ratio.tv`       | `4/3`     |
| `ratio.double`   | `2/1`     |
| `ratio.wide`     | `16/9`    |
| `ratio.poster`   | `2/3`     |
| `ratio.portrait` | `3/4`     |
