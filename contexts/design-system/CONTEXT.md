# Design System

`@tuja/ui` — a StyleX system of generated colour, role-based tokens, composable style objects, and accessible React components — together with the bilingual showcase site that documents it.

## Language

**Hue**:
One colour family in the generated system palette: a source sRGB colour expanded into an HCT tonal series. ZH: 色相.
_Avoid_: 色调 (that is Tone)

**Tone**:
One lightness step within a hue, from `_0` (darkest) to `_100`. ZH: 色调.
_Avoid_: step, shade, 明度阶梯

**Token Role**:
What a colour token is for: the part of the interface it paints — canvas, surface, control — or the Intent it carries. It names a job, not a component, a look (that is a Tone) or an owner (that is a brand). ZH: 令牌角色.
_Avoid_: role (bare, in code and copy), semantic colour, purpose, category, structure (for this sense), 语义色

**Intent**:
The six-member family that carries meaning rather than structure — accent, info, success, warning, danger, neutral — and the prop that takes one. ZH: 意图色.
_Avoid_: variant (for this sense), tone (for this sense), semantic colour, status hue, colour treatment, 语义色, 语义变体, 语义化的状态色, 色调, 颜色处理

**Material**:
The treatments that give a surface a look beyond its colour and border — texture, wash, and glass — and the foundation page that presents them. ZH: 质感.
_Avoid_: effect, effects, finish, 效果, 材质

**Variant**:
One curated configuration of a component that its Lab offers ready-made — Button's Primary, Outline, Icon only, Busy. A look is one prop's value; a Variant is a whole configuration. ZH: 变体.
_Avoid_: preset, example, story, look (for this sense), 外观 (that is a look), 预设

**Primitive**:
A composable multi-property StyleX style object — `flex`, `stack`, `layout`, `motion`, `reset`, `root`, `a11y`, `selected`, `corner`, `texture`, `wash`, `typeRole`, `pageColumn` — spread through the `css` prop. Not a component, and not a generated hue file. ZH: 原语.
_Avoid_: recipe, pattern (for this sense), 配方

**Rhythm**:
The space between two things, named by how they relate rather than by its size: `inline` between the parts of one unit on one line, `tight` inside one item, `item` between siblings in a group, `group` between groups, `section` between h2 sections. The `rhythm` tokens hold it. `space` is the scale for geometry that is not a relationship, such as padding and offsets. ZH: 节奏.
_Avoid_: spacing scale, gap size, 间距阶梯 (each of these is `space`)

**Measure**:
The cap on the length of a line of prose: `measure.prose` for running text, `measure.short` for a short block that stands alone. It caps a line, not the page (that is the Page column). ZH: 行长.
_Avoid_: max width, line width, reading width, column width, 阅读宽度

**Page column**:
The centred column a page's content sits in, `layout.maxInlineSize` wide plus its gutters, set by the `pageColumn` Primitive. It places a page, not a line of prose (that is the Measure), and it is not the reading column of the doc pages. ZH: 页面栏.
_Avoid_: content width, container, wrapper, site measure, reading column (for this sense), 版心, 内容宽度

**Wide page column**:
The page column widened to the whole screen, so the content keeps only the page gutter: `pageColumn.wide`, composed with `pageColumn.base` or `pageColumn.scroller`. It is for a gallery of cards, such as a poster grid, that takes every column a wide screen has room for; prose stays in the page column. A page with a wide gallery sets `HeaderFooterLayout`'s header controls on it with `wideHeader`, so they share the gallery's edges. ZH: 宽页面栏.
_Avoid_: full-bleed (that has no gutter), edge-to-edge, 通栏

**Stack**:
A container that owns the space between its children, at one Rhythm step: `stack.*` for a column, `cluster.*` for a row that wraps, `row.*` for a row that does not. ZH: 堆叠.
_Avoid_: spacer, list (for this sense), 间隔器

**Type role**:
The job a piece of text does, named by what it is rather than by its size — `display`, `subDisplay`, `h1`–`h4`, `body`, `bodySmall`, `label`, `caption`, `overline`, `control`, `controlCaption`, and the fluid roles that grow with the viewport or a container. One type role names a size, line height, weight and tracking together. The `typeRole` Primitive holds them, and `Text` and `Heading` take one as their `look`. ZH: 字体角色.
_Avoid_: type scale, font size, text style, 字阶 (each of these is a `font` token)

**Lab**:
A component page's interactive view — a live, operable Specimen on the canvas, with the Variants, one control per prop, and the snippet for what is on the canvas beside it. ZH: 实验室.
_Avoid_: playground, sandbox, workbench, studio, 游乐场, 沙盒

**Specimen**:
A real instance of a component, placed to illustrate it rather than to be used.
_Avoid_: preview, demo (a mock's own label for the visitor, such as "Demo menu", is copy, not this term)

**Effect boundary**:
An element on the effect layer with no effect of its own, which the effects of its scope flow around. `useEffectBoundary` makes one. ZH: 效果边界.
_Avoid_: obstacle (in copy), container (for this sense)

**Effect container**:
An element that holds a scope of effects apart from the page. `useEffectContainer` makes one. To the scope around it, it is an Effect boundary. ZH: 效果容器.
_Avoid_: effect boundary (that is an obstacle), effect scope, sandbox, 效果作用域

**Effect cover**:
An element that shows over the page, such as a sheet or a dialog, so that the effects of the elements under it and not inside it do not draw. `useEffectCover` makes one; a modal cover (`{ modal: true }`) is one that locks the page under it. ZH: 效果遮盖.

**Effect carrier**:
What an element's effects move with: the viewport, or the content of a Scroll region. Each `<canvas>` element of the effect layer belongs to a carrier, never to one element. `EffectCarrier` declares one. ZH: 效果载体.
_Avoid_: frame (one drawn `EffectFrame`), plane (a z-index rung), layer, stage, surface, effect origin (the viewport origin is the 0 × 0 point)

**Scroll region**:
A scroller whose content is an Effect carrier, so that the compositor moves the effects in it with its scroll. The page is the root Scroll region; `useScrollRegion` makes a nested one. ZH: 滚动区域.
_Avoid_: scroll container (the CSS term, which is broader)

**Ring light**:
A comet of light that runs round an element's outline on the effect layer, one lap when an element arrives (`useRingLight`). It marks a moment and carries no meaning of its own. ZH: 环形光.
_Avoid_: glow, halo, shimmer, border animation, 光晕, 流光

**Toast**:
A short message about what an action did, on a capsule of Glass at the bottom of the screen, with up to two actions such as Undo. One shows at a time, and it goes by itself. `ToastProvider` shows it, `useToast` asks for it, and `Toast` is its surface. ZH: 轻提示.
_Avoid_: snackbar, notification, flash message, banner (that is a Callout), 通知, 消息条

**Tab view**:
The frame of an app with a few top-level destinations, declared once: a narrow rail of them, each an icon over a small label, where the view is `md` wide or wider, and a floating Tab bar where it is narrower. `TabView` is the component. It holds the destinations, not the screens under them. ZH: 标签视图.
_Avoid_: tab bar (that is the floating pill alone), sidebar layout (that is the wide text sidebar of the doc pages), nav rail, app shell, 底部导航

**Navigation split view**:
Up to three columns side by side, each with its own scroll: a sidebar, the content, and the detail of what is picked. It fits the columns to the width it gets: while the detail shows beside the content, the sidebar folds to the Collapsed sidebar. On a phone it is stacked: the content fills the view, and the detail opens in a sheet over it. What is picked comes from its consumer, normally the URL. `NavigationSplitView` is the component. ZH: 导航分栏视图.
_Avoid_: master–detail, list–detail, split pane, columns layout, 主从布局

**Collapsed sidebar**:
The narrow form of a Navigation split view's sidebar, such as a strip of logos, which shows while the detail shows beside the content, and where the full sidebar does not fit. It is the same column as the sidebar, not a fourth one. ZH: 收起侧栏.
_Avoid_: mini sidebar, icon rail, compact sidebar, 迷你侧栏

**Column link**:
A link in a column of a Navigation split view that opens or changes the column after it, such as a row of a list. A Column link that opens a deeper column adds a history entry, and one that changes a column already open replaces it. J and K move between the Column links of a column. `SplitViewLink` is the component. ZH: 栏内链接.
_Avoid_: row link, drill link, nav link

**Shared element**:
One thing that a Navigation split view shows in more than one form, such as an account's avatar in the sidebar and its tile in the Collapsed sidebar, or a chart in the content and its compact form in the sidebar. Each form takes the same name from `useSplitViewShared`. When a navigation hides one form and shows another, the view flies the one into the other. ZH: 共享元素.
_Avoid_: hero element, matched geometry, morph target, 英雄元素
