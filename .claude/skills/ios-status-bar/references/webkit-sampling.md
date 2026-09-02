# How WebKit samples fixed containers

Read from WebKit main and verified on device, 2026-09-02. Paths are relative to the WebKit checkout root.

## Where it runs

`LocalFrameView::fixedContainerEdges` in `Source/WebCore/page/LocalFrameView.cpp`
runs only when the frame has viewport-constrained objects. A page with no fixed
or sticky boxes is never sampled.

## The hit test

One point per edge. For the top edge it is the midpoint of the top edge of the
fixed-position layout rect, contracted by 4px.

Hit-test options: `ReadOnly`, `IgnoreClipping`, `DisallowUserAgentShadowContent`,
`ForFixedContainerSampling`, plus `IgnoreCSSPointerEventsProperty` on the first
pass. So `pointer-events: none` does not hide a box from the first pass.

A second pass, honouring pointer-events, runs only when the first pass walked
past a fixed ancestor that was hidden, too large, or negative-z, and that
ancestor had `pointer-events: none`.

## Which layers can be hit

In `Source/WebCore/rendering/RenderLayer.cpp`, hit testing under
`ForFixedContainerSampling` skips any layer that is not viewport-constrained,
has no viewport-constrained descendant, and has no fixed or sticky ancestor. It
also skips composited scrollable overflow with no background. Only fixed and
sticky subtrees can be hit.

## The `::backdrop` shortcut

If the hit element has a `::backdrop` pseudo-element, which means a top-layer
`<dialog>` or popover, it is taken at once as a viewport-sized dimming
container. Its colour is the backdrop's own background, or the page's extended
background colour. There is no way to opt a top-layer element out of this.

## The ancestor walk

Otherwise WebKit walks the hit node's ancestors, self first, and classifies each
renderer that has a layer and is fixed or sticky.

**Hidden or nearly transparent, skipped.** The layer is `visibility: hidden` or
opacity zero; or the opacity is under the sampler's nearly-transparent
threshold; or the box has no background, no `backdrop-filter`, no first child,
and is not a replaced element.

**Otherwise, size classification.** Compare the box's own border box
(`absoluteBoundingBoxRect`, so descendants do not count) with the viewport, per
axis. The viewport length is the smaller of the fixed-position rect and the size
used for default viewport units. A ratio under 0.9 is Smaller, under 1.05 is
Similar, anything else is Larger.

| Width       | Height      | Extra condition                                         | Result                    |
| ----------- | ----------- | ------------------------------------------------------- | ------------------------- |
| Smaller     | Smaller     |                                                         | TooSmall, skipped         |
| Smaller     | not Smaller |                                                         | IsSidebar, candidate      |
| not Smaller | not Smaller | has background, no children, transparent or translucent | IsDimmingLayer, candidate |
| any         | Larger      | not dimming                                             | TooLarge, skipped         |
| Similar     | Similar     | negative used `z-index`                                 | Skipped                   |
| Similar     | Similar     |                                                         | IsViewportSizedCandidate  |
| any         | any         | anything else                                           | IsCandidate               |

The first candidate in the walk wins.

## The colour

1. If any non-hidden ancestor in the chain has a `backdrop-filter`, the edge
   colour is `PredominantColorType::Multiple`.
2. Else the first visible resolved background colour of an ancestor thicker than
   10px and not Smaller.
3. For a dimming, viewport-sized, or sidebar container, a colour already found
   is kept.
4. Else, if the container is the same element as last time, the last colour is
   kept.
5. Else `PageColorSampler::predominantColor` samples a 2px strip along the top
   edge of the page.

Alpha under 0.75 is blended over the page background. Otherwise the colour is
forced opaque.

## The latch

`Page::updateFixedContainerEdges` in `Source/WebCore/page/Page.cpp`.

When no container is found for a side, or the new predominant colour is
invisible while the old one was visible, the previous colour is kept, as long as
the last container element still has a renderer and `visibility: visible`. A
`<header>` at the top of the document, or a `<footer>` at the bottom, keeps it
even when hidden.

A page load makes a new document, so a reload clears the latch. Client-side
navigation does not.

## When the top edge is sampled at all

The top edge is sampled only when the page is not rubber-banded above its top, and
one of these holds:

- `topContentInsetBackgroundCanChangeAfterScrolling` is on, or
- the user has never scrolled or interacted since load, or
- the document is still parsing.

`defaultTopContentInsetBackgroundCanChangeAfterScrolling` in
`Source/WebKit/Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm` is true on the
iPhone idiom and false elsewhere. So on iPhone, sampling keeps going after the
user scrolls.

## What Safari does with the result

`-[WKWebView _updateFixedContainerEdges:]` in
`Source/WebKit/UIProcess/API/Cocoa/WKWebView.mm` applies it as a colour
extension view under the obscured inset, and as the top scroll pocket colour.
iPhone uses a soft (blur) top scroll edge effect that a fixed edge replaces with
the flat colour. iPad uses a hard edge.
