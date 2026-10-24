---
name: effect-layer
description: How elements join the @tuja/ui WebGPU effect layer. Consult before you add or move an effect hook (useRipple, useLiquid, useRingLight, useDust, useLightBeam, useBlackHole, useExtractorFan, useEffectBoundary, useEffectContainer, useEffectCover, useEffectSticky, useScrollRegion), before you make a fixed, sticky or scrolling surface that can hold controls with effects (Switch, SegmentedControl, TabBar, Toast), and before you add a <canvas> element anywhere in packages/ui.
---

# Effect layer

The layer is global. `EffectLayerProvider` mounts it one time. Every
`<canvas>` element belongs to an **Effect carrier**: the viewport or a
**Scroll region**. The page is the root Scroll region. A `<canvas>` element
never belongs to an element. A component never adds a `<canvas>` element.

## Join

- An element joins through the ref of an effect hook. Nothing else.
- `useEffectContainer` + `<EffectContainer>` clip effects to a box and keep them apart.
- `useEffectCover` hides the effects under a surface that shows over the page.
  Use `useEffectCover({ modal: true })` for a surface that locks the page, such
  as a sheet, a modal dialog or an open drawer. While it shows, the layer
  frees the `<canvas>` elements of the page and of each Scroll region under it.

## Declare the carrier

The carrier comes from the nearest `EffectCarrier` above the effect hook in the
React tree, also through a portal. Measurement gives only the geometry. It
does not choose the `<canvas>` element.

| The box…                                                 | Declare                                                                                                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scrolls with the page                                    | nothing (default)                                                                                                                                                                      |
| is fixed to the viewport                                 | `<EffectCarrier value="viewport">`                                                                                                                                                     |
| is fixed by its bottom inset only                        | `<EffectCarrier value="viewport-bottom">`                                                                                                                                              |
| is `position: sticky` against the page                   | `const sticky = useEffectSticky()`: its `ref` and `css` on the sticky box, `<EffectCarrier value={sticky}>` inside                                                                     |
| is a scroller with effects inside                        | `useScrollRegion()`: `scroller` ref on the scroller, `content` ref on one `position: relative` box that holds all of the scrolled content, and `<EffectCarrier value={region}>` inside |
| is `position: sticky` in a Scroll region                 | `useEffectSticky()` as against the page, inside `<EffectCarrier value={region}>`                                                                                                       |
| is fixed at one breakpoint and sticky at another         | `useEffectSticky()`: a fixed box at its inset counts as stuck                                                                                                                          |
| holds fixed or sticky boxes (a stage with a `transform`) | `<EffectCarrier value="contained">`                                                                                                                                                    |

- A sticky box is right under the effects while it is not stuck, and on its
  own plane (`raised` for sticky chrome) while it is stuck. Its plane comes
  only from the `css` of `useEffectSticky`, after the box's own styles, so
  the plane and the carrier follow one stuck watch. Do not switch the plane
  of a sticky box yourself. Destructure the result
  (`const { ref, isStuck, css } = sticky`) and pass the whole result to
  `EffectCarrier`: the React Compiler refuses a read of `sticky.ref`,
  because it sees the object as a ref.
- `Portal` already puts its children on the viewport. `HeaderControls`,
  `SidebarLayout`, `Drawer`, `StickyControls`, a vertical `ScrollMask`, a
  `Table` with `stickyHeader`, `TableHead` and the sheet of `MenuButton`
  declare their own carriers.
- The layer puts the two `<canvas>` elements of a Scroll region at the end of
  its content box, on `layer.effect` in the stacking context around it. Put
  chrome in the scroller that must stay over the effects, such as a close
  button, on `layer.raised`.
- A sticky box in a Scroll region sticks to the region's scroller.
  `useEffectSticky` takes that scroller from the carrier context and watches
  the box against it, so the box's plane and carrier follow the same rule as
  on the page. While the box is stuck, its effects draw on the region's
  parent carrier. Do not add a `<canvas>` element for a sticky box or for a
  scroller.
- The bands scroll on the block axis only. A scroller that scrolls only on
  the inline axis is not a Scroll region. The layer measures the elements in
  it again after each scroll, one frame late.
- Each Scroll region with `<canvas>` elements holds two bands in memory.
  There is no limit on how many show at one time.

## Why

The scroll `<canvas>` elements sit in the scrolled content of the page or of
a Scroll region, so the compositor moves them with the content, and the
viewport `<canvas>` elements stay with the viewport. An effect on the right carrier needs no measurement
on scroll. A measurement on scroll is one frame late, and the effect lags.
A sticky box changes carrier only when it sticks or lets go, and only that one
frame is late.

## Check

In development, the layer warns in the console one time for each element
whose declaration does not agree with where the browser lays it out, for
example `<div> has a fixed ancestor, but no <EffectCarrier value="viewport">
declares it`, or `<div> is in the scroller <div>, but no useScrollRegion
declares it`. Fix the declaration. Do not add measuring. The check never
chooses a `<canvas>` element, and it does nothing in production. A modal
Effect cover locks the page, so in it a box in the document can declare
`<EffectCarrier value="viewport">` without a fixed box.

`?effects=debug` shows each band and each registered element: green on the
page and in a Scroll region, orange on the viewport.
