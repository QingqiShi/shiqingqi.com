# Tokens

Each token group is defined in one file, and the comments there say what each member is for. Read that file for the members and their values. This page says where each group is, and how to choose between close options.

Import `color` from `@tuja/ui/color.stylex`, `breakpoints` and `pointer` from `@tuja/ui/breakpoints.stylex`, and every other group from `@tuja/ui/tokens.stylex`.

| Group                                       | File                                                                                  | What to read there                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `color`                                     | `packages/ui/src/color.stylex.ts`                                                     | The naming grammar at the top, and the comment on each token in the `light` object             |
| `rhythm`, `space`                           | `packages/ui/src/tokens.stylex.ts`                                                    | The JSDoc on `rhythm`: which relationship takes which step, and when lines of text take no gap |
| `font`, `latinType`                         | `packages/ui/src/tokens.stylex.ts`                                                    | The steps the type roles are built from. Compose a role, not a size                            |
| `controlSize`, `controlHeight`              | `packages/ui/src/tokens.stylex.ts`                                                    | Sizes in a control, larger on touch and smaller from `md`                                      |
| `border`, `shadow`, `opacity`, `ratio`      | `packages/ui/src/tokens.stylex.ts`                                                    | Widths, radii, elevation, the disabled fade, aspect ratios                                     |
| `layer`                                     | `packages/ui/src/tokens.stylex.ts`                                                    | The comment above it: the z-index ladder and why each plane sits where it does                 |
| `constants`, `layout`, `measure`            | `packages/ui/src/tokens.stylex.ts`                                                    | The dark and no-`corner-shape` queries, the page cap, the line lengths                         |
| `breakpoints`, `pointer`                    | `packages/ui/src/breakpoints.stylex.ts`                                               | The width queries, `pointer.canHover` and `pointer.coarse`                                     |
| A component's own colours, such as `syntax` | The component's `.stylex.ts` file, such as `packages/ui/src/content/syntax.stylex.ts` | A colour that only one component reads ships with that component, not in `color`               |

## Colour

- Choose the property first, then the subject: a divider is a border drawn as a box, so it takes a `border*` token.
- An Intent drawn as a mark at fill strength, such as an icon's `color`, `fill` or `stroke`, takes `bg<Intent>`. A ring or an outline takes `border<Intent>`.
- To make a token translucent, mix it: `color-mix(in srgb, ${color.bgCanvasFade} 45%, transparent)`. The `*Fade` tokens are the colours that a translucent gradient blends toward.

## Space

Measure a gap between what a reader sees. Text on no surface is seen at its content box, so the padding of a link counts as space.

## Type

- Haffer comes in two weights, 400 and 600, and `packages/ui/src/fonts.css` turns off font synthesis. A weight of 500 or less shows at 400, and a heavier one at 600, so take `font.weight_4` or `font.weight_6`. `font.weight_5` is for the components that will be medium when Haffer gets a Medium face; until then it shows at 400, so do not rely on it for emphasis.
- In `apps/web`, a Chinese page takes a taller body leading and another font stack from `chineseType` in `apps/web/src/theme/global-styles.ts`.

## Controls

A control takes `minBlockSize` from `controlHeight`, not a fixed height, so it grows with larger text.
