# Design System

`@tuja/ui` — a StyleX system of generated colour, role-based tokens, composable style objects, and accessible React components — together with the bilingual showcase site that documents it. The package is published, so this vocabulary is a public API, and API names (`look`, `intent`, `tone`, `as`, `onDismiss`) stay untranslated inside zh copy.

## Language

**Hue**:
One colour family in the generated system palette, defined by a source sRGB colour expanded into an HCT tonal series. There are thirteen. ZH: 色相.
_Avoid_: 色调 (that is Tone)

**Tone**:
One lightness step within a hue. The series runs `_0` (darkest) to `_100`, denser at the extremes than the Material 3 grid. ZH: 色调.
_Avoid_: step, shade, 明度阶梯

**Token Role**:
What a colour token is for, as a general semantic concept: the part of the interface it paints — canvas, surface, control — or the Intent it carries. A Token Role is never a component and never one component's own colour; it names a job any component may need, not a look (that is a Tone) nor an owner (that is a brand). ZH: 令牌角色.
_Avoid_: role (bare, in code and copy), semantic colour, purpose, category, structure (for this sense), 语义色

**Intent**:
The six-member family that carries meaning rather than structure — accent, info, success, warning, danger, neutral. The prop name on every component that takes one. ZH: 意图色.
_Avoid_: variant (for this sense), tone (for this sense), semantic colour, status hue, colour treatment, 语义色, 语义变体, 语义化的状态色, 色调, 颜色处理

**Material**:
The treatments that give a surface a look beyond its colour and border — texture, wash, and glass — and the foundation page that presents them. ZH: 质感.
_Avoid_: effect, effects, finish, 效果, 材质

**Variant**:
One curated configuration of a component that its Lab offers ready-made — Button's Primary, Outline, Icon only, Busy. Choosing one sets several props at once: a look is one prop's value, a Variant is a whole configuration. ZH: 变体.
_Avoid_: preset, example, story, look (for this sense), 外观 (that is a look), 预设

**Primitive**:
A composable multi-property StyleX style object — `flex`, `stack`, `layout`, `motion`, `reset`, `a11y`, `corner`, `texture`, `wash` — spread through the `css` prop. Not a component, and not a generated hue file. ZH: 原语.
_Avoid_: recipe, pattern (for this sense), 配方

**Rhythm**:
The space between two things, named by how they relate rather than by its size: `inline` between the parts of one unit on one line, `tight` inside one item, `item` between siblings in a group, `group` between groups, `section` between h2 sections. Each step is about twice the one below. The `rhythm` tokens hold it; `space` stays the scale for geometry that is not a relationship, such as padding and offsets. ZH: 节奏.
_Avoid_: spacing scale, gap size, 间距阶梯 (each of these is `space`)

**Stack**:
A container that owns the space between its children, at one Rhythm step: `stack.*` for a column, `cluster.*` for a row that wraps, `row.*` for a row that does not. Its children set no margin to push their neighbours away. ZH: 堆叠.
_Avoid_: spacer, list (for this sense), 间隔器

**Lab**:
A component page's interactive view — a live, operable Specimen on the canvas, with the Variants, one control per prop, and the snippet for what is on the canvas beside it. ZH: 实验室.
_Avoid_: playground, sandbox, workbench, studio, 游乐场, 沙盒

**Specimen**:
A real instance of a component, placed to illustrate it rather than to be used. In an overview tile it is `inert` and out of the tab order; inside a showcase section it may be fully operable.
_Avoid_: preview, demo — except where a mock labels _itself_ for the visitor ("Demo menu", "Demo toggle"); those strings stay.

**Effect boundary**:
An element registered on the effect layer with no effect of its own, through `useEffectBoundary`, so that the effects of its scope see it and flow around it. An Effect container is an Effect boundary to the scope around it. ZH: 效果边界.
_Avoid_: obstacle (in copy), container (for this sense)

**Effect container**:
An element, made one with `useEffectContainer`, that holds a scope of effects apart from the page: each effect hook belongs to the nearest `EffectContainer` above it in the React tree, or else to the page, and effects act only between elements of one scope. Its effects draw on the effect layer, clipped to its border box. ZH: 效果容器.
_Avoid_: effect boundary (that is an obstacle), effect scope, sandbox, 效果作用域
