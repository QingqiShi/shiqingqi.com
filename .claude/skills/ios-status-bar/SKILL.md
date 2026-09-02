---
name: ios-status-bar
description: trigger whenever someone adds or changes a `position: fixed` or `position: sticky` element, a portal target, an overlay, dialog, sheet, backdrop, scrim, modal, toast, or header bar; whenever a user reports the iOS Safari status bar turning solid, opaque, flat, or a constant colour, or the top of the page losing its blur, Liquid Glass, scroll edge effect, or safe-area transparency; and before using the native `<dialog>` or popover top layer. The skill explains how WebKit samples fixed containers for the status-bar colour and how to keep boxes out of that sampling.
---

# iOS status bar sampling

Safari on iOS draws a soft blur behind the status bar, unless the page tells it a
colour. It works that out by hit-testing one point: the midpoint of the top edge
of the fixed-position rect, pulled in by 4px. Only fixed and sticky subtrees can
be hit. WebKit then walks the hit node and its ancestors, and the first box that
counts as a candidate wins. A candidate replaces the blur with a flat colour.

The colour then latches. It survives scrolling and client-side navigation, and
clears only on a page load. So the cost of one wrong box is that the top of the
page loses its Progressive blur for the rest of the visit.

Two facts trip people up:

- `pointer-events: none` does not hide a box from the first pass. The sampler
  passes `IgnoreCSSPointerEventsProperty`.
- The box's own border box is measured. Children with `visibility: hidden` or
  zero opacity do not shrink it, and a closed overlay shell still counts as
  content.

## Decision guide

Measure the box's own border box against the viewport, per axis. Smaller means
under nine tenths.

| The box                                                          | WebKit                                 |
| ---------------------------------------------------------------- | -------------------------------------- |
| Smaller in both axes                                             | TooSmall, walked past. Safe.           |
| Smaller in width only                                            | IsSidebar, candidate                   |
| Full width, shorter than the viewport                            | Candidate. The classic header bar.     |
| Viewport-sized, with a background, a backdrop-filter, or a child | Candidate                              |
| Viewport-sized, no children, translucent background              | Dimming layer, candidate               |
| Both axes near viewport, negative used `z-index`                 | Skipped                                |
| Over 1.05 viewport tall, no background                           | TooLarge, walked past                  |
| No background, no `backdrop-filter`, no first child              | Nearly transparent, skipped            |
| Top-layer `<dialog>` or popover                                  | `::backdrop` taken at once. Candidate. |

So for a new fixed or sticky box, the options are: make it a 0 x 0 anchor and
give its children their own size; keep it Smaller in both axes; give it a
negative `z-index` if it must be viewport-sized; or make it over 1.05 viewport
tall with no background.

A sticky bar parked below the header strip is safe because it never covers the
sample point, not because of its size. That safety depends on the offset. Check
it again if the header height or the bar's inset changes.

## What the repo already has

- `viewportAnchor.fixed` and `viewportFill.absolute` in
  `packages/ui/src/primitives/layout.stylex.ts`. The anchor is the 0 x 0 fixed
  box, the fill is the absolute `100vw` / `100dvh` child.
- `apps/web/src/components/shared/portal-target-provider.tsx`. The page's portal
  target is that anchor. It used to be a fixed full-viewport box, and any
  portalled overlay, open or closed, flattened the status bar until reload.
- `packages/ui/src/components/progressive-blur.tsx`. Every blur wrapper is a
  0 x 0 fixed box (`reachLayers`) whose layers read their size from a custom
  property, so the box on the Blur plane never grows.
- `packages/ui/src/components/header-controls.tsx`. The header floats two narrow
  control groups instead of one bar across the top.
- `findStatusBarCandidates` in `apps/web/e2e/media-detail-pages.spec.ts` is the
  executable guard. It walks every fixed and sticky box that covers the
  top-centre point, because `elementsFromPoint` honours `pointer-events: none`
  and would miss the culprit.
- The rule in domain language is the "Progressive blur" entry in
  `packages/ui/CONTEXT.md`.

## Verifying

Playwright WebKit renders the page but not Safari's chrome, so the guard checks
box geometry and the status bar itself can only be checked on a device. Tell the
user to reload before they look, because a latched colour survives everything
except a load.

## The full algorithm

Read `references/webkit-sampling.md` for the exact thresholds, how the colour is
chosen, the latch conditions, the second hit-test pass, and the WebKit source
paths. Open it when the behaviour on device does not match the table above, or
when a box needs to sit close to one of the thresholds.
