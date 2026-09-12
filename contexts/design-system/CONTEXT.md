# Design System

`@tuja/ui` — a StyleX system of generated colour, role-based tokens, composable style objects, and accessible React components — together with the bilingual showcase site that documents it. The package is published, so this vocabulary is a public API, and API names (`look`, `intent`, `tone`, `as`, `onDismiss`) stay untranslated inside zh copy.

## Language

**Hue**:
One colour family in the generated system palette, defined by a source sRGB colour expanded into an HCT tonal series. There are thirteen. ZH: 色相.
_Avoid_: 色调 (that is Tone)

**Tone**:
One lightness step within a hue. The series runs `_0` (darkest) to `_100`, denser at the extremes than the Material 3 grid. ZH: 色调.
_Avoid_: step, shade, 明度阶梯

**Token**:
A named design value exposed as a StyleX var. Tokens reference tones; consumers reference tokens and never a tone directly.
_Avoid_: var (as in `fieldVars`), CSS variable

**Intent**:
The six-member family that carries meaning rather than structure — accent, info, success, warning, danger, neutral. The prop name on every component that takes one. ZH: 意图色.
_Avoid_: variant (for this sense), tone (for this sense), semantic colour, status hue, colour treatment, 语义色, 语义变体, 语义化的状态色, 色调, 颜色处理

**Material**:
The treatments that give a surface a look beyond its colour and border — texture, wash, and glass — and the foundation page that presents them. ZH: 质感.
_Avoid_: effect, effects (the Tinker's word; it never travels back into the design system), finish, 效果, 材质

**Variant**:
One curated configuration of a component that its Lab offers ready-made — Button's Primary, Outline, Icon only, Busy. Choosing one sets several props at once: a look is one prop's value, a Variant is a whole configuration. ZH: 变体.
_Avoid_: preset, example, story, look (for this sense), 外观 (that is a look), 预设

**Primitive**:
A composable multi-property StyleX style object — `flex`, `layout`, `motion`, `reset`, `a11y`, `corner`, `texture`, `wash` — spread through the `css` prop. Not a component, and not a generated hue file. ZH: 原语.
_Avoid_: recipe, pattern (for this sense), 配方

**Modifier**:
A single-property override that tunes a primitive — `align`, `justify`, `grow`, `shrink`.

**Lab**:
A component page's interactive view — a live, operable Specimen on the canvas, with the Variants, one control per prop, and the snippet for what is on the canvas beside it. Not the Tinker: a Lab shows a component's API to a visitor, the Tinker retunes its styles for the author. ZH: 实验室.
_Avoid_: playground, sandbox, workbench, studio, 游乐场, 沙盒

**Specimen**:
A real instance of a component, placed to illustrate it rather than to be used. In an overview tile it is `inert` and out of the tab order; inside a showcase section it may be fully operable.
_Avoid_: preview, demo — except where a mock labels _itself_ for the visitor ("Demo menu", "Demo toggle"); those strings stay.
