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

Theme-aware color tokens. All have light and dark variants.

### Text

| Token                      | Light     | Dark      |
| -------------------------- | --------- | --------- |
| `color.textMain`           | `#292929` | `#f3eded` |
| `color.textMuted`          | `#505050` | `#bbbbbb` |
| `color.textOnActive`       | `#ffffff` | `#ffffff` |
| `color.textOnControlThumb` | `#292929` | `#000000` |

### Backgrounds

| Token                                   | Light              | Dark                    |
| --------------------------------------- | ------------------ | ----------------------- |
| `color.backgroundMain`                  | `#ffffff`          | `#000000`               |
| `color.backgroundRaised`                | `#f5f5f5`          | `#1a1a1a`               |
| `color.backgroundHover`                 | `#f0f0f0`          | `#2a2a2a`               |
| `color.backgroundTranslucent`           | `rgba(0,0,0,0.01)` | `rgba(255,255,255,0.1)` |
| `color.backgroundCalculatorButton`      | `#e0e0e0`          | `#444850`               |
| `color.backgroundCalculatorButtonHover` | `#ffffff`          | `#5e6065`               |

Channel tokens for `rgba()` construction:

| Token                            | Light         | Dark       |
| -------------------------------- | ------------- | ---------- |
| `color.backgroundMainChannels`   | `255,255,255` | `0,0,0`    |
| `color.backgroundRaisedChannels` | `245,245,245` | `26,26,26` |

### Controls

| Token                      | Light     | Dark      |
| -------------------------- | --------- | --------- |
| `color.controlTrack`       | `#e0e0e0` | `#1a1a1a` |
| `color.controlThumb`       | `#ffffff` | `#bbbbbb` |
| `color.controlActive`      | `#7e10c2` | `#933bc9` |
| `color.controlActiveHover` | `#9e2de3` | `#a751db` |

### Other

| Token                  | Light        | Dark         |
| ---------------------- | ------------ | ------------ |
| `color.border`         | `#e0e0e0`    | `#333333`    |
| `color.opacityActive`  | `0.1`        | `0.2`        |
| `color.shadowColor`    | `220 3% 15%` | `220 40% 2%` |
| `color.shadowStrength` | `1%`         | `25%`        |

### Brand Colors

| Token                    | Light            | Dark               |
| ------------------------ | ---------------- | ------------------ |
| `color.brandTmdb`        | `#0ea5e9`        | `#38bdf8`          |
| `color.brandCalculator`  | `#ff8000`        | `#ff7f00`          |
| `color.brandCitadel`     | `rgb(26,54,104)` | `rgb(129,174,255)` |
| `color.brandWtcPlus`     | `#e661b2`        | `#ff84cf`          |
| `color.brandWtcLetter`   | `#0a47ed`        | `#8dacff`          |
| `color.brandBristol`     | `#bf2f38`        | `#ff535d`          |
| `color.brandNottingham`  | `#005480`        | `#0098e7`          |
| `color.brandSpotify`     | `#1ecc5a`        | `#1ecc5a`          |
| `color.brandStudentLoan` | `#10b981`        | `#34d399`          |

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

Six elevation levels (`shadow._1` through `shadow._6`), each using `color.shadowColor` and `color.shadowStrength` for theme-aware rendering. Higher numbers = more elevation.

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
