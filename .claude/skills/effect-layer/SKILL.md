---
name: effect-layer
description: How elements join the @tuja/ui WebGPU effect layer. Consult before you add or move an effect hook (useRipple, useLiquid, useRingLight, useDust, useLightBeam, useBlackHole, useExtractorFan, useEffectBoundary, useEffectContainer, useEffectCover), before you make a fixed, sticky or scrolling surface that can hold controls with effects (Switch, SegmentedControl, TabBar, Toast), and before you add a <canvas> element anywhere in packages/ui.
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

## Declare the carrier

The carrier comes from the nearest `EffectCarrier` above the effect hook in the
React tree, also through a portal. Measurement gives only the geometry. It
does not choose the `<canvas>` element.

| The box…                                                 | Declare                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| scrolls with the page                                    | nothing (default)                                                                                                  |
| is fixed to the viewport                                 | `<EffectCarrier value="viewport">`                                                                                 |
| is fixed by its bottom inset only                        | `<EffectCarrier value="viewport-bottom">`                                                                          |
| is `position: sticky` against the page                   | `const sticky = useEffectSticky()`: its `ref` and `css` on the sticky box, `<EffectCarrier value={sticky}>` inside |
| is fixed at one breakpoint and sticky at another         | `useEffectSticky()`: a fixed box at its inset counts as stuck                                                      |
| holds fixed or sticky boxes (a stage with a `transform`) | `<EffectCarrier value="contained">`                                                                                |

- A sticky box is right under the effects while it is not stuck, and on its
  own plane (`raised` for sticky chrome) while it is stuck. Its plane comes
  only from the `css` of `useEffectSticky`, after the box's own styles, so
  the plane and the carrier follow one stuck watch. Do not switch the plane
  of a sticky box yourself. Destructure the result
  (`const { ref, isStuck, css } = sticky`) and pass the whole result to
  `EffectCarrier`: the React Compiler refuses a read of `sticky.ref`,
  because it sees the object as a ref.
- `Portal` already puts its children on the viewport. `HeaderControls`,
  `SidebarLayout`, `Drawer` and `StickyControls` declare their own carriers.
- A nested scroller has no carrier yet. The layer measures the elements in it
  again after each scroll, one frame late. Scroll region carriers for nested
  scrollers (`ScrollMask`, sheets, a sticky box inside a scroller) come in a
  later change. Do not work around it with a `<canvas>` element or with more
  measuring.

## Why

The scroll `<canvas>` elements sit in the scrolled content, so the
compositor moves them with the content, and the viewport `<canvas>` elements
stay with the viewport. An effect on the right carrier needs no measurement
on scroll. A measurement on scroll is one frame late, and the effect lags.
A sticky box changes carrier only when it sticks or lets go, and only that one
frame is late.

## Check

In development, the layer warns in the console one time for each element
whose declaration does not agree with where the browser lays it out, for
example `<div> has a fixed ancestor, but no <EffectCarrier value="viewport">
declares it`. Fix the declaration. Do not add measuring. The check never
chooses a `<canvas>` element, and it does nothing in production.

`?effects=debug` shows each band and each registered element: green on the
page, orange on the viewport.
