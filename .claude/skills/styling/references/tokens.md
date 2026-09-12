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

### Text

| Token                 | Use                                              |
| --------------------- | ------------------------------------------------ |
| `color.textMain`      | Body text; holds the APCA Lc 75 floor            |
| `color.textMuted`     | Secondary text; holds the APCA Lc 60 floor       |
| `color.accentOn`      | Text or icon on top of an `accent` fill          |
| `color.textOnBright`  | Text on a bright surface, e.g. `bgSurfaceBright` |
| `color.textOnInverse` | Text on a `bgInverse` surface                    |
| `color.accentText`    | Accent-toned text used on its own, not on a fill |

### Page

| Token                  | Use                                     |
| ---------------------- | --------------------------------------- |
| `color.bgCanvas`       | App shell background, behind everything |
| `color.bgCanvasSubtle` | A slightly stronger canvas background   |
| `color.bgCanvasFade`   | Color translucent gradients fade toward |

### Surface

| Token                   | Use                                                  |
| ----------------------- | ---------------------------------------------------- |
| `color.bgSurface`       | Cards, panels, dialog bodies                         |
| `color.bgSurfaceRaised` | A surface lifted above the page, e.g. on hover       |
| `color.bgSurfaceSunken` | A recessed surface, e.g. an inset field              |
| `color.bgSurfaceBright` | A bright surface, pairs with `textOnBright`          |
| `color.bgSurfaceFade`   | Color translucent gradients fade toward on a surface |

### Interactive

| Token                         | Use                                                                   |
| ----------------------------- | --------------------------------------------------------------------- |
| `color.bgInteractiveRest`     | Default background for buttons, list rows, menu items                 |
| `color.bgInteractiveHover`    | Background while hovered                                              |
| `color.bgInteractivePressed`  | Background while pressed                                              |
| `color.bgInteractiveSelected` | Background while selected                                             |
| `color.bgInteractiveDisabled` | Background for a disabled control, composited with `opacity.disabled` |

### Intent surfaces, inverse & overlay

Tonal tints (`surface*Subtle`, `surfaceAccentMuted`) are `rgba(<hue>_rgb, α)`
recipes, one per intent. `bgInverse` flips the theme, for tooltips and
snackbars that need to stand out against the page. `bgOverlay` is the popover
surface behind menus and modals. `bgScrim` is a fixed `rgba(0, 0, 0, α)` dim
layer behind modals, the same in both themes.

### Roles

| Token                | Use                                               |
| -------------------- | ------------------------------------------------- |
| `color.accent`       | Accent fill for primary actions                   |
| `color.accentHover`  | Accent fill while hovered                         |
| `color.accentGlow`   | Ambient glow behind an accent element             |
| `color.neutral`      | Neutral fill for secondary chrome                 |
| `color.neutralHover` | Neutral fill while hovered                        |
| `color.neutralText`  | Neutral-toned text used on its own, not on a fill |
| `color.neutralOn`    | Text or icon on top of a `neutral` fill           |

### Borders & semantic colors

Translucent borders (`accentBorder`, `infoBorder`, `successBorder`,
`warningBorder`, `dangerBorder`) are `rgba(<hue>_rgb, α)` recipes;
`neutralBorder` is opaque. Semantic sets (`info`, `success`, `warning`,
`danger`, each with a `Hover`, `Text`, and `On` variant) map to one hue ramp
per intent. See `tokens.stylex.ts` for the exact steps.

### Brand Colors

`brandTmdb`, `brandCalculator`, `brandCitadel`, `brandWtcPlus`,
`brandWtcLetter`, `brandBristol`, `brandNottingham`, `brandSpotify`,
`brandStudentLoan`, `brandPixelCreatureCreator` — nearest system-palette
swatch per brand, themed light/dark.

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
