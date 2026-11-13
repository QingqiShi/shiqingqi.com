# Tokens

Each token group is defined in one file, and the comments there say what each member is for. Read that file for the members and their values. This page says where each group is, and how to choose between close options.

Import `color` from `@tuja/ui/color.stylex`, `breakpoints` and `pointer` from `@tuja/ui/breakpoints.stylex`, and every other group from `@tuja/ui/tokens.stylex`.

| Group                                       | File                                                                                  | What to read there                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `color`                                     | `packages/ui/src/color.stylex.ts`                                                     | The naming rules at the top, and the comment on each token in the `light` object               |
| `rhythm`, `space`                           | `packages/ui/src/tokens.stylex.ts`                                                    | The JSDoc on `rhythm`: which relationship takes which step, and when lines of text take no gap |
| `font`, `latinType`                         | `packages/ui/src/tokens.stylex.ts`                                                    | The steps the type roles are built from. Compose a role, not a size                            |
| `controlSize`, `controlHeight`              | `packages/ui/src/tokens.stylex.ts`                                                    | Sizes in a control, larger on touch and smaller from `md`                                      |
| `border`, `shadow`, `opacity`, `ratio`      | `packages/ui/src/tokens.stylex.ts`                                                    | Widths, radii, elevation, the disabled fade, aspect ratios                                     |
| `layer`                                     | `packages/ui/src/tokens.stylex.ts`                                                    | The comment above it: the z-index ladder and why each plane sits where it does                 |
| `constants`, `layout`, `measure`            | `packages/ui/src/tokens.stylex.ts`                                                    | The dark and no-`corner-shape` queries, the page cap, the line lengths                         |
| `breakpoints`, `pointer`                    | `packages/ui/src/breakpoints.stylex.ts`                                               | The width queries, `pointer.canHover` and `pointer.coarse`                                     |
| A component's own colours, such as `syntax` | The component's `.stylex.ts` file, such as `packages/ui/src/content/syntax.stylex.ts` | A colour that only one component reads ships with that component, not in `color`               |

## Colour

The names are those of shadcn/ui. Choose the token by what the element is, then give its content the paired foreground.

| The element                                                        | Fill                         | Content on it           |
| ------------------------------------------------------------------ | ---------------------------- | ----------------------- |
| The page, the content of an app shell                              | `background`                 | `foreground`            |
| A container on the page                                            | `card`                       | `cardForeground`        |
| A menu, a popover, anything that floats                            | `popover`                    | `popoverForeground`     |
| The sidebar beside a page                                          | `sidebar`                    | `sidebarForeground`     |
| A quiet region: a well, a code block, a disabled control           | `muted`                      | `foreground`            |
| An item under the pointer, pressed or selected                     | `accent`                     | `accentForeground`      |
| A neutral piece: a secondary button, a neutral badge, a track      | `secondary`                  | `secondaryForeground`   |
| The main action, a selected mark                                   | `primary`                    | `primaryForeground`     |
| Something that destroys, or that is wrong                          | `destructive`                | `destructiveForeground` |
| A status                                                           | `success`, `warning`, `info` | `<name>Foreground`      |
| A tint of `primary`, `destructive`, `success`, `warning` or `info` | `<name>Subtle`               | `<name>Text`            |
| The scrim behind a modal                                           | `overlay`                    | `overlayForeground`     |

- Secondary text is `mutedForeground`, on every surface and fill. In a screen, write it as `tone="muted"` on `Text`.
- Text or an icon in the colour of a meaning is `<name>Text`. A mark at fill strength, such as a dot or the stroke of a chart, takes `<name>`.
- A line is `border` (an edge, a divider), `input` (the edge of a field, and a neutral mark such as a track or a grabber), `borderStrong` (an edge that is the only sign of a control: it holds 3:1) or `ring` (the focus ring). A divider drawn as a box takes `border` as its `backgroundColor`.
- `muted`, `accent` and `secondary` are opaque and have the same value. The three names let a theme give them different values, so choose by what the element is. An item with an `accent` state on a `muted` region does not show the state: put it on a surface.
- A state has no token. Under the pointer, pressed or selected, an element takes `accent`. `quietSurface.interactive` does this. A solid fill takes `color-mix(in srgb, ${color.primary} 90%, transparent)`.
- A component prop that names a meaning takes the name of the token: `intent="destructive"` paints `destructive`, and `tone="primary"` paints `primary`.
- To make a token translucent, mix it: `color-mix(in srgb, ${color.background} 45%, transparent)`.

## Space

Measure a gap between what a reader sees. Text on no surface is seen at its content box, so the padding of a link counts as space.

## Type

- Haffer comes in two weights, 400 and 600, and `packages/ui/src/fonts.css` turns off font synthesis. A weight of 500 or less shows at 400, and a heavier one at 600, so take `font.weight_4` or `font.weight_6`. `font.weight_5` is for the components that will be medium when Haffer gets a Medium face; until then it shows at 400, so do not rely on it for emphasis.
- In `apps/web`, a Chinese page takes a taller body leading and another font stack from `chineseType` in `apps/web/src/theme/global-styles.ts`.

## Controls

A control takes `minBlockSize` from `controlHeight`, not a fixed height, so it grows with larger text.
