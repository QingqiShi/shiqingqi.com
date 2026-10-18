---
name: ios-safari-edge-tint
description: How iOS Safari tints its status bar and its bottom toolbar from the fixed and sticky boxes at the screen edges, and how to keep boxes out of that sampling. Trigger whenever someone adds or changes a `position: fixed` or `position: sticky` element, a portal target, an overlay, dialog, sheet, backdrop, scrim, modal, toast, header bar, or bottom bar; whenever a user reports the iOS Safari status bar or the band under the bottom toolbar turning solid, opaque, flat, or a constant colour, or the top of the page losing its blur, Liquid Glass, scroll edge effect, or safe-area transparency; and before using the native `<dialog>` or popover top layer.
---

# iOS Safari edge tint

Safari on iOS draws a soft blur behind the status bar, unless the page tells it a
colour. It works that out by hit-testing one point: the midpoint of the top edge
of the fixed-position rect, pulled in by 4px. Only fixed and sticky subtrees can
be hit. WebKit then walks the hit node and its ancestors, and the first box that
counts as a candidate wins. A candidate replaces the blur with a flat colour.

The bottom edge is sampled the same way, at the midpoint of the bottom edge
pulled in by 4px. A candidate there turns the band under Safari's bottom
toolbar into a flat colour, such as a sheet card's fill.

The colour then latches. It survives scrolling and client-side navigation, and
clears only on a page load. So the cost of one wrong box is that the edge of the
page loses its blur for the rest of the visit. A box that covers a sample point
only while it slides in or is dragged still latches its colour, so a box that
moves must stay out of the sampling at every position.

Three facts trip people up:

- `pointer-events: none` does not hide a box from the first pass. The sampler
  passes `IgnoreCSSPointerEventsProperty`.
- The box's own border box is measured. Children with `visibility: hidden` or
  zero opacity do not shrink it, and a closed overlay shell still counts as
  content.
- A replaced element, such as `<canvas>`, `<img>` or `<video>`, is never
  nearly transparent. A bare fixed `<canvas>` element that fills the viewport
  is a candidate, even with no children and no background.

## Decision guide

Measure the box's own border box against the viewport, per axis. Smaller means
under nine tenths.

| The box                                                           | WebKit                                 |
| ----------------------------------------------------------------- | -------------------------------------- |
| Smaller in both axes                                              | TooSmall, walked past. Safe.           |
| Smaller in width only                                             | IsSidebar, candidate                   |
| Full width, shorter than the viewport                             | Candidate. The classic header bar.     |
| Viewport-sized, with a background, a backdrop-filter, or a child  | Candidate                              |
| Viewport-sized, no children, translucent background               | Dimming layer, candidate               |
| Both axes near viewport, negative used `z-index`                  | Skipped                                |
| Over 1.05 viewport tall, no background                            | TooLarge, walked past                  |
| No background, no `backdrop-filter`, no first child, not replaced | Nearly transparent, skipped            |
| Top-layer `<dialog>` or popover                                   | `::backdrop` taken at once. Candidate. |

So for a new fixed or sticky box, the options are: make it a 0 x 0 anchor and
give its children their own size, from a custom property if they must fill the
viewport; keep it Smaller in both axes, such as narrow control groups in place
of one bar across the top; give it a negative `z-index` if it must be
viewport-sized; or make it over 1.05 viewport tall with no background.

A sticky bar parked below the header strip is safe because it never covers the
sample point, not because of its size. That safety depends on the offset. Check
it again if the header height or the bar's inset changes.

## A modal surface at the bottom edge

A card that slides in from below the screen crosses the bottom sample point, so
a fixed card latches the toolbar band to its fill. Two more Safari facts shape
the way around it:

- Safari paints no fixed subtree below the top of its bottom toolbar, but it
  paints the document there. So keep the card and the dimmed page out of fixed
  positioning: make them absolute in the document, and place the card at the
  bottom of the visual viewport in document coordinates. That also keeps it
  above an on-screen keyboard.
- Safari paints nothing past the end of the document, not even ink overflow
  such as a `box-shadow`. So while the surface is open, make the document one
  screen taller, or the dimmed page stops short above the toolbar.

## Verifying

Playwright WebKit renders the page but not Safari's chrome, so a test can check
only box geometry; the tint itself can only be checked on a device. A geometry
guard walks every fixed and sticky box and applies the table above, because
`elementsFromPoint` honours `pointer-events: none` and would miss the culprit.
For a box that moves, check it at every position it passes through, not only at
rest. Tell the user to reload before they look on a device, because a latched
colour survives everything except a load.

## The full algorithm

Read `references/webkit-sampling.md` for the exact thresholds, how the colour is
chosen, the latch conditions, the second hit-test pass, and the WebKit source
paths. Open it when the behaviour on device does not match the table above, or
when a box needs to sit close to one of the thresholds.
