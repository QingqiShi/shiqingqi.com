# Primitives

A primitive is a style object of two or more properties that encodes a common pattern. Each one is in `packages/ui/src/primitives/<name>.stylex.ts`, imported as `@tuja/ui/primitives/<name>.stylex`. The files are short, and their names and JSDoc say what each member sets: read the file for its members. This page says which primitive to choose, the order to compose them in, and the traps that the files do not show.

## Flex and stack

`flex.*` sets the display and the alignment, and `align`, `justify`, `grow` and `shrink` (all in `flex.stylex.ts`) each change one property after it: `css={[flex.row, align.end]}`.

When a container also owns the space between its children, take `stack.*` (a column), `cluster.*` (a row that wraps) or `row.*` (a row that does not wrap) from `stack.stylex.ts`, not `flex.*` with a gap of your own. Compose a modifier after it for the one property that differs. `cluster.*` and `row.*` set `flexDirection: row`, so they win over a stack composed before them. `Card` is already a `stack.item`.

## Page column

`page-column.stylex.ts` describes each width. To choose:

- A gallery of cards, such as a poster grid, takes `pageColumn.wide`, so that a wide screen fits more columns. Prose stays in the page column. Pass `wideHeader` to `HeaderFooterLayout` on such a page, so the header controls share the gallery's edges.
- A named width (`list`, `settings`, `report`) composes with `base` or `scroller`, or goes in the `css` of a `NavigationSplitView` or a `TabView`. Their JSDoc says which screens take it.

## Type role

Copy goes through `Text` and `Heading` first, with their `look` prop. Compose a `typeRole.*` yourself only for text that these do not render.

The colour of text goes the same way: `tone` on `Text`, which has `default`, `muted`, `primary`, `success`, `warning`, `destructive` and `info`. `Text` renders a `p`, a `span`, a `div`, an `li`, a `dt`, a `dd` and a `figcaption`, so text in a screen seldom needs an element of its own. A raw element with a type role and a colour is the sign that it must be a `Text`.

**`data-prose`** marks a layout box that holds running text, such as each `DocSection` body. On a Chinese page, its direct child paragraphs justify when the box is wide enough (`apps/web/src/app/global.css` has the rule and the width). Put a paragraph directly in the box, not in a wrapper `div`. Do not mark a box that holds other text, such as a card or a caption, where a short justified line opens wide gaps. `data-prose` also makes the box an `inline-size` container, so a `cqi` unit or an unnamed container query inside it measures that box.

## Corner

`cornerTokens.height` sets the height at which `corner.squircle_round` closes its corners. A control with its own height sets it in a local `stylex.create`, as `SegmentedControl` does: `{ [cornerTokens.height]: controlSize._7 }`.

## Root

`root.html` goes on `<html>` and `root.body` on `<body>`, once. In `apps/web`, `root.html` goes through `getDocumentClassName` in `apps/web/src/theme/global-styles.ts`, because the Theme script sets the class. StyleX cannot select by tag, so `apps/web/src/app/global.css` balances a raw `<h1>`–`<h6>` that has no heading role.

## Motion presets

`motion.stylex.ts` has the transitions, the animations, the durations and `easing`.

- `transition.all` also animates a layout property that changes on the element. Name the properties instead when one can change.
- `animate.expand` and `animate.collapse` animate `grid-template-rows`, which runs layout. Do not use them.

## Motion engine

`@tuja/ui/motion/*`, in `packages/ui/src/motion/`. Each file's JSDoc describes its exports.

| Module                                         | For                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `spring-roles`                                 | `springRoles` and `springOf`: the spring of each thing that moves       |
| `use-motion-engine`                            | `useMotionEngine` and `useMotionValue`, for a component                 |
| `create-motion-value`                          | The `MotionValue` interface: `set`, `to` and their options              |
| `use-binding`                                  | `useBinding`: writes values to an element through a `pose`              |
| `play-layout`                                  | `captureLayout` and `playLayout`: move elements to their new layout box |
| `create-motion-engine`, `bind`                 | The engine and the binding outside React                                |
| `prefers-reduced-motion`, `use-reduced-motion` | The one reduced-motion store                                            |

## Flow blocks

`SKILL.md` says when to register. `useFlowBlock` (`packages/ui/src/motion/use-flow-block.tsx`) and `FlowBlock` (`packages/ui/src/surfaces/flow-block.tsx`) describe their options in JSDoc. `useFlowPanel` (`packages/ui/src/motion/use-flow-panel.ts`) is internal to `packages/ui`. A new panel follows `Disclosure`, which also gives its content box `display: flow-root` and says why.

## Accessibility

`a11y.stylex.ts` describes the focus rings and the touch targets. A text field with no frame of its own leaves the ring to its frame: compose `a11y.focusRingWithin` on the frame and `stylex.defaultMarker()` on the field, as `apps/web/src/movie-database/chat/chat-textarea.tsx` does.

Three things take the 44px hit area of `a11y.touchTarget` away:

- An ancestor that clips overflow also clips the hit area. Give a control inside one 44px of its own under `pointer.coarse`, or move the clip to an inner element.
- A small control closer to a field or another control than its hit area extends covers it and takes its taps. Make the gap larger under `pointer.coarse`.
- Controls that touch, such as the options of `SegmentedControl`, cannot share the gap. Each one needs 44px of its own under `pointer.coarse`.

## Selected

`selected.stylex.ts` describes `selected.marked` and `selectedTokens.rest`. Where the content of an item covers its background, such as a colour swatch or an image thumbnail, neither `selected.marked` nor `quietSurface.interactive` shows. Keep a ring there.

## Quiet surface

`quietSurface.interactive` is for a link or button with no fill of its own that fills under the pointer: a row of a list, a menu item, a segmented choice, a bare icon button. A control with a surface at rest is a different look. A card that also moves on hover composes it, and keeps its own transform and shadow.

- **The caller sets the shape.** Compose a `corner.*` and set the padding. A button takes `buttonReset.base` first, because it sets the same properties.
- **The caller's own styles come after it.** It sets `color: inherit`, `cursor`, no text decoration, the colour transition and the ring. A style that changes one of them, such as a muted `color` or a transition with a transform, comes later in `css`. An element whose fill must change at once, such as a combobox option, sets `transition: null`.
- **The ring is inset**, because a row abuts its neighbours and often sits in an ancestor that clips overflow. Compose `a11y.focusRing` after it for an element that stands alone, such as a chip.
- **It reads the selected state itself.** Set `aria-current`, `aria-pressed`, `aria-checked` or `aria-selected`, and set a rest background through `selectedTokens.rest`.
- **It sets no size.** A row under 44px composes `a11y.touchRow` before it.

```tsx
const styles = stylex.create({
  row: { paddingBlock: space._1, paddingInline: space._2 },
});

<Link
  href={href}
  aria-current={isCurrent ? "page" : undefined}
  {...stylex.props(corner.radius_3, quietSurface.interactive, styles.row)}
>
```

## Hover

A tap on a touch screen leaves `:hover` matching until the next tap elsewhere, so every hover style goes behind `pointer.canHover` from `@tuja/ui/breakpoints.stylex`. It lives beside `breakpoints` because the breakpoints Babel plugin inlines both, and StyleX ranks only an inlined media query as one.

A hover that reveals something is one of two kinds, and the kind decides what touch sees:

- **It adds content or a control the visitor needs** (a label they must read, a button they must reach): touch gets the revealed state in full.
- **It adds only emphasis** (a colour, a motion, an open cue such as "Details"): touch stays at rest, the same as a desktop at rest. A colour reveal also takes `:active`, so the surface lights up under the finger while it presses.

```tsx
import { pointer } from "@tuja/ui/breakpoints.stylex";

const styles = stylex.create({
  // Feedback: wrap the hover value. Touch keeps the rest state. An element that
  // is transparent at rest takes `quietSurface.interactive` instead.
  row: {
    backgroundColor: {
      default: color.card,
      ":hover": { default: null, [pointer.canHover]: color.accent },
    },
  },
  // Several hover keys on one property, or a chained key such as
  // `:disabled:hover` (which takes no nested value): one branch for all.
  filter: {
    backgroundColor: {
      default: color.card,
      [pointer.canHover]: {
        default: null,
        ":hover": color.accent,
        ":disabled:hover": color.card,
      },
    },
  },
  // A reveal of something the visitor needs, such as an action button that
  // shows on hover: the revealed state is the default, and only a device that
  // can hover holds it back.
  rowAction: {
    opacity: {
      default: 1,
      [pointer.canHover]: { default: 0, ":hover": 1 },
    },
  },
  // A reveal of emphasis alone: touch stays at rest. The colour also shows on
  // press, gated as well, because a gated hover outranks a bare `:active`.
  logo: {
    filter: {
      default: "grayscale(1)",
      ":hover": { default: null, [pointer.canHover]: "grayscale(0)" },
      ":active": {
        default: "grayscale(0)",
        [pointer.canHover]: "grayscale(0)",
      },
    },
  },
});
```

`pointerConstants.NON_TOUCH_DEVICE` from `@tuja/ui/primitives/layout.stylex` is stricter: it also excludes every device that has a touch pointer at all. Use it only for an affordance that a touch device replaces, such as the scroll buttons of `ScrollMask`, and never for a hover style.

## Icons

A Phosphor icon is 1em square and fills with `currentColor`, so it takes its size and colour from its parent. Beside text it needs nothing: it takes the text's size. Anywhere else, give the parent a type role or a `controlSize` font size. A component slot (`icon`, `leading`, `indicator`) already does this. Every icon names its `weight`: `bold` inside a control, to match the package's own glyphs.

```tsx
const styles = stylex.create({
  close: { fontSize: controlSize._5 },
});

<button css={[buttonReset.base, styles.close]} aria-label="Close">
  <XIcon weight="bold" aria-hidden />
</button>;
```

## Material

`texture.stylex.ts` and `wash.stylex.ts` are primitives. Glass is the component style `glassSurface` from `@tuja/ui/components/glass-surface.stylex` (`packages/ui/src/surfaces/glass-surface.stylex.ts`). Each file states its rules and its dial tokens. The Material page and its showcases (`apps/web/src/design-system/sections/foundations/texture-showcase.tsx`, `wash-showcase.tsx`, `glass-showcase.tsx`) say when to use each one.

## A class that a third-party stylesheet needs

Do not put `className` beside `css` on one element. When a third-party stylesheet needs a literal class, spread `stylex.props` and join the class by hand: `const sx = stylex.props(...); <div {...sx} className={`${sx.className ?? ""} ln-grid`}>`. The repo has one, in `apps/web/src/movie-database/browse/table/media-table-grid.tsx`.
