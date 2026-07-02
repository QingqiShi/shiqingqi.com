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
value that resolves against the element's `color-scheme` — no per-theme
stylesheets exist, and forcing a theme just pins `color-scheme` on the root.
Values below are palette references (see
`packages/ui/src/_generated/palette/`); the mapping lives in
`packages/ui/src/tokens.stylex.ts`.

### Text

| Token                 | Light        | Dark         |
| --------------------- | ------------ | ------------ |
| `color.textMain`      | `gray._20`   | `gray._92`   |
| `color.textMuted`     | `gray._40`   | `gray._80`   |
| `color.textSubtle`    | `gray._50`   | `gray._60`   |
| `color.accentOn`      | `gray._100`  | `gray._100`  |
| `color.textOnBright`  | `gray._20`   | `gray._0`    |
| `color.textOnInverse` | `gray._92`   | `gray._20`   |
| `color.accentText`    | `purple._30` | `purple._70` |

### Page

| Token                  | Light      | Dark      |
| ---------------------- | ---------- | --------- |
| `color.bgCanvas`       | `gray._97` | `gray._0` |
| `color.bgCanvasSubtle` | `gray._99` | `gray._2` |
| `color.bgCanvasFade`   | `gray._92` | `gray._0` |

### Surface

| Token                   | Light       | Dark       |
| ----------------------- | ----------- | ---------- |
| `color.bgSurface`       | `gray._100` | `gray._5`  |
| `color.bgSurfaceRaised` | `gray._100` | `gray._7`  |
| `color.bgSurfaceSunken` | `gray._98`  | `gray._2`  |
| `color.bgSurfaceBright` | `gray._100` | `gray._80` |
| `color.bgSurfaceFade`   | `gray._95`  | `gray._5`  |

### Interactive

| Token                         | Light       | Dark       |
| ----------------------------- | ----------- | ---------- |
| `color.bgInteractiveRest`     | `gray._100` | `gray._7`  |
| `color.bgInteractiveHover`    | `gray._97`  | `gray._13` |
| `color.bgInteractivePressed`  | `gray._92`  | `gray._11` |
| `color.bgInteractiveSelected` | `gray._90`  | `gray._9`  |
| `color.bgInteractiveDisabled` | `gray._95`  | `gray._5`  |

### Intent surfaces, inverse & overlay

Tonal tints (`surface*Subtle`/`surfaceAccentMuted`) are `rgba(<hue>_rgb, α)`
recipes; `bgInverse` flips the theme (`gray._20` / `gray._92`), `bgOverlay` is
the popover surface (`gray._100` / `gray._7`), `bgScrim` is
`rgba(0, 0, 0, 0.7)` in both themes.

### Roles

| Token                | Light                       | Dark                        |
| -------------------- | --------------------------- | --------------------------- |
| `color.accent`       | `purple._30`                | `purple._50`                |
| `color.accentHover`  | `purple._40`                | `purple._60`                |
| `color.accentGlow`   | `rgba(purple_rgb._30, 0.1)` | `rgba(purple_rgb._50, 0.2)` |
| `color.neutral`      | `gray._80`                  | `gray._40`                  |
| `color.neutralHover` | `gray._70`                  | `gray._50`                  |
| `color.neutralText`  | `gray._40`                  | `gray._80`                  |
| `color.neutralOn`    | `gray._20`                  | `gray._92`                  |

### Borders & semantic colors

Translucent borders (`accentBorder`, `infoBorder`, `successBorder`,
`warningBorder`, `dangerBorder`) are `rgba(<hue>_rgb, 0.4)` recipes;
`neutralBorder` is opaque (`gray._90` / `gray._20`). Semantic sets
(`info|success|warning|danger` + `Hover`/`Text`/`On`) map to the cyan, green,
orange/yellow, and red ramps — see `tokens.stylex.ts` for exact steps.

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
