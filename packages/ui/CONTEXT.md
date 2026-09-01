# Design System

`@tuja/ui` — a StyleX system of generated colour, role-based tokens, composable style objects, and accessible React components — together with the showcase site that documents it. The package is published, so this vocabulary is a public API.

## Language

### Colour

**Hue**:
One colour family in the generated system palette, defined by a source sRGB colour expanded into an HCT tonal series. There are thirteen.

**Tone**:
One lightness step within a hue. The series runs `_0` (darkest) to `_100`, denser at the extremes than the Material 3 grid.
_Avoid_: step, shade

**Swatch**:
One tone's background/foreground pair — the unit the palette codegen emits.

**Ramp**:
A hue's full ordered series of tones. Colour only.
_Avoid_: tonal scale, tonal palette

**Scale**:
An ordered series of sizes — the type scale, the control-height scale, the spacing scale. Size only.
_Avoid_: ramp (for sizes: "type-scale ramp", "height ramp", "diameter ramp")

**Token**:
A named design value exposed as a StyleX var. Tokens reference tones; consumers reference tokens and never a tone directly.
_Avoid_: var (as in `fieldVars`), CSS variable

**Role**:
The grouping axis for background tokens: Page, Surface, Interactive, Intent, Inverse, Overlay.
_Avoid_: semantic (as a grouping word)

**Intent**:
The six-member family that carries meaning rather than structure — accent, info, success, warning, danger, neutral. The prop name on every component that takes one.
_Avoid_: variant (for this sense), tone (for this sense), semantic colour, status hue, colour treatment

### Shape

**Squircle**:
The superellipse curve every fixed-radius corner takes. The `corner` primitive pairs it with the radius, so the shape ships inside the styles that round a corner rather than as a global rule a consumer must add. Radius tokens size the corner; the squircle is its shape. A pill or a circle is round by identity, so it keeps circular caps. A browser without `corner-shape` draws a circular arc at 0.6 of the radius, which the tokens carry as their fallback value, so the corner reads the same there.
_Avoid_: rounded rectangle, continuous corner

### Wash and blur

**Wash**:
A broad gradient that gives a surface some volume — one tone drifting across it. It has no hotspot, because a hotspot is a light source.
_Avoid_: glow, tint, gradient (as the name of this — the CSS function keeps its name)

**Progressive blur**:
The page blurred around whatever floats, in place of dimming it — the ramp centred on the element's edge, like a shadow with no spread, so only the falloff shows and the page is sharp again a little way out. The blur belongs to the page rather than to the element, and the element keeps a crisp edge. The radius is set per element, within a cap. Also used at the edge of a scroll region, where it is a Scroll mask.
Every fixed box the blur places stays narrow, because Safari on iOS samples the fixed element under the top-centre of the viewport: one at least nine tenths of the viewport wide makes it paint a flat colour into the status bar in place of its own scroll-edge blur, and a box narrower than that is walked past. So a page's header floats a control group per end of the measure rather than one bar across the top, and a blur's own box carries its size in a custom property the layers read instead of taking it.
_Avoid_: halo, glow, elevation, shadow, disturbance

**Blur plane**:
The one plane a page shell paints its floating controls' Progressive blurs on — under all of them and above the page — so no control's blur ever lands on another control. The header's control groups and the page's sticky chrome both blur there. A popup is the exception: it covers the chrome around it, so its blur stays beside it, over that chrome rather than under it.
_Avoid_: blur layer, backdrop layer

**Scroll mask**:
The progressive blur at the edge of a scroll region, marking content on its way out of view.
_Avoid_: fade, gradient mask

### Component API

**Variant**:
A component's visual treatment when it is neither an Intent nor a size — `Text`'s type step, `Divider`'s weight, `IconButton`'s fill.

**Size**:
The dimension axis. Always `sm` | `md` | `lg`.
_Avoid_: small, medium, large (as prop values)

**Icon**:
The decorative SVG a component renders beside its content, and the prop that supplies one.
_Avoid_: glyph

**Slot**:
A subcomponent passed in as a prop, so the consumer replaces one internal piece while the parent keeps layout, accessibility, and state. See `DESIGN.md`.

**Sheet**:
A popup that spans the bar its trigger sits in rather than hanging off the trigger's own corner — `MenuButton`'s `position="sheet"`. Not a centred dialog and not an edge-anchored panel; if it does not span a bar it is not a Sheet.
_Avoid_: drawer, bottom sheet, panel (for this sense)

**Drawer**:
`SidebarLayout`'s navigation rail in its mobile form below `md` — edge-anchored, focus-trapped, scroll-locked, dismissed by following a link inside it. One element is both the Drawer and the `md`+ rail. Not a Sheet: a Sheet spans a bar, a Drawer hangs off an edge.

**Badge**:
The inert `<span>` that labels something or reports its status. It never takes a click.

**Chip**:
The interactive pill — a link or a button — that the visitor can activate or select. If it can be clicked it is a Chip, not a Badge; the two are not size or colour variants of each other.
_Avoid_: pill, tag, token (as the name of this component)

**Monogram**:
The one or two characters an `Avatar` derives from a name when there is no portrait.
_Avoid_: initials (in prose — the `initials` prop name is the override, not the concept)

**Escape hatch**:
The route from one abstraction layer down to the one below — usually the `css` prop, sometimes a shared style object like `cardSurface`. Every layer has one.

**controlSize**:
The spacing scale that is responsive by definition — larger on touch, tighter from `md` up. Distinct from `space`; choosing between them is a real decision, not a preference.

### Composition

**Primitive**:
A composable multi-property StyleX style object — `flex`, `layout`, `motion`, `reset`, `a11y`, `corner` — spread through the `css` prop. Not a component, and not a generated hue file.
_Avoid_: recipe, pattern (for this sense)

**Modifier**:
A single-property override that tunes a primitive — `align`, `justify`, `grow`, `shrink`.

**Chrome**:
Non-content UI furniture: dividers, field borders, card edges, header bars. Never the browser.

**Shell**:
A page-level layout frame. Every page gets exactly one of the two.

### The showcase site

**Specimen**:
A real instance of a component, placed to illustrate it rather than to be used. In an overview tile it is `inert` and out of the tab order — most are scaled down, though the whole-page ones fill their plate instead. Inside a Showcase it may be fully operable, because there the point is to let a visitor work it.
_Avoid_: preview, demo — except where a mock labels _itself_ for the visitor ("Demo menu", "Demo toggle"); those strings stay.

**Plate**:
The sunken panel a specimen sits on. Structure that holds still while its contents drain of colour at rest.
_Avoid_: tray

**Illustration**:
The abstract graphic a foundation tile carries, in place of a specimen.
_Avoid_: illo (in prose — the `--ds-illo-*` var prefix is a frozen contract), scene, art

**Showcase**:
One labelled section on a documentation page. A page has many; each may hold specimens, illustrations, or neither.

**Identifier**:
A name the documentation renders for copying rather than reading — a token name, a prop name, a Phosphor component name. Distinct from a Token, which is the value itself: the same component renders all three kinds, and none of them may be truncated or broken mid-word, because the name is the content.
_Avoid_: label, key (for this sense)

## Chinese terms

The showcase site ships bilingual copy, so each term needs one Chinese word too — the same rule applies, and `zh` drifts the same way `en` does. API names (`variant`, `tone`, `as`, `onDismiss`) stay untranslated inside zh copy.

| Term             | zh       | Not                                                   |
| ---------------- | -------- | ----------------------------------------------------- |
| Hue              | 色相     | 色调 (that is Tone)                                   |
| Tone             | 色调     | 明度阶梯                                              |
| Ramp             | 色调阶梯 |                                                       |
| Intent           | 意图色   | 语义色, 语义变体, 语义化的状态色, 色调, 颜色处理      |
| Role             | 角色     | 语义 (as a grouping word)                             |
| Icon             | 图标     | 字形 (that is a typographic glyph)                    |
| Chip             | 标签按钮 | 筹码 (a gambling chip), 药丸 (a medicine pill)        |
| Badge            | 徽章     | 标签 (that is a label)                                |
| Primitive        | 原语     | 配方                                                  |
| pill shape       | 胶囊形   | 药丸, 标签                                            |
| Wash             | 淡彩     | 渐变 (that is a gradient), 光晕                       |
| Progressive blur | 渐进虚化 | 光晕, 光环 — both name light, and nothing here is lit |
| Blur plane       | 虚化平面 | 模糊图层 (that is a blur layer)                       |
| Scroll mask      | 滚动虚化 | 遮罩 (that is a mask in general)                      |
| Squircle         | 超椭圆角 | 圆角矩形 (that is a rounded rectangle)                |

`语义` is correct only for the HTML/ARIA sense — 语义元素, 语义层级, `<button>` 语义 — matching English "semantic element/rank".

## Frozen contracts

Published var names and generated identifiers. Rename only through codegen and a major version.

- Token group names and members: `color.*`, `space._N`, `controlSize._N`, `border.*`, `shadow._N`, `layer.*`, `font.{ui,vp,cq}*`
  - `shadow._N` is unused, because nothing casts a shadow, but it is still exported. Removing it is a major version.
- The `_N` step convention, including `_00` for the sub-minimum step
- `<hue>` and `<hue>_rgb` consts groups, and the `hues/` file layout the wildcard export covers
- The `*Fade`, `*On`, and `accentGlow` token suffixes
- `motionTokens.playState`
- CSS custom properties `--ds-illo-*`
- The `.stylex.ts` suffix — StyleX permits only its own constructs (`defineVars`, `defineConsts`, `create`, …) as exports from these files
