/**
 * The edges of a box in CSS px, in viewport coordinates.
 *
 * @internal
 */
export interface Edges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * How far, in CSS px, an element's box can be from the box it was watched
 * at and still count as in place. The root margin rounds each edge out by
 * less than 1px.
 */
const MOVE_TOLERANCE = 1 + 1 / 16;
/** How far the intersection ratio can change before the watch re-arms. */
const RATIO_BAND = 0.001;

/**
 * The `rootMargin` that shrinks or grows `root` to `rect`, each edge rounded
 * out to a whole px, as a browser rounds a root margin. An element at `rect`
 * then fills the root, and any move takes a part of it out.
 *
 * @internal
 */
export function moveRootMargin(rect: Edges, root: Edges) {
  const insets = [
    rect.top - root.top,
    root.right - rect.right,
    root.bottom - rect.bottom,
    rect.left - root.left,
  ];
  return insets.map((inset) => `${String(-Math.floor(inset))}px`).join(" ");
}

/**
 * Thresholds just under and just over `ratio`, so that the observer reports
 * a change either way, and stays quiet while the ratio stays.
 *
 * @internal
 */
export function moveThresholds(ratio: number) {
  const low = Math.max(0, ratio - RATIO_BAND);
  const high = Math.min(1, ratio + RATIO_BAND);
  return low === high ? [low] : [low, high];
}

/**
 * Whether two boxes have the same edges, give or take the root margin's
 * rounding.
 *
 * @internal
 */
export function edgesMatch(a: Edges, b: Edges) {
  return (
    Math.abs(a.left - b.left) <= MOVE_TOLERANCE &&
    Math.abs(a.top - b.top) <= MOVE_TOLERANCE &&
    Math.abs(a.right - b.right) <= MOVE_TOLERANCE &&
    Math.abs(a.bottom - b.bottom) <= MOVE_TOLERANCE
  );
}

/**
 * Where to watch an element from: its box and the root's box, both read in
 * the same layout.
 *
 * @internal
 */
export interface MoveWatchArea {
  readonly rect: Edges;
  /**
   * Watch against the viewport, for an element fixed to it. Otherwise watch
   * against the root element, so that a window scroll moves neither.
   */
  readonly fixed: boolean;
  /** The viewport, or the root element's border box. */
  readonly root: Edges;
}

/**
 * Calls `onMove` when the element moves away from `area.rect`, whatever
 * moved it: a layout shift, a nested scroll, a sticky box, a transform. No
 * observer reports a move directly, so an `IntersectionObserver` watches a
 * root shrunk to the element's own box: a move takes a part of the element
 * out of that root, and the intersection ratio changes.
 *
 * The ratio is less than 1 while an ancestor clips the element, and the
 * watch re-arms at that ratio without a call. While an ancestor clips all of
 * the element, a move that keeps it clipped changes nothing, so the watch
 * reports it only when the element shows again.
 *
 * The root element's box ends where its content ends, so a change to the
 * height of the document can move the element and the root together. Watch
 * the root element's size as well, and watch again when it changes.
 *
 * @internal
 */
export function observeMove(
  element: Element,
  area: MoveWatchArea,
  onMove: () => void,
) {
  const margin = moveRootMargin(area.rect, area.root);
  const root = area.fixed ? null : element.ownerDocument.documentElement;
  let ratio = 1;
  let observer = arm();

  function arm() {
    const next = new IntersectionObserver(onEntries, {
      root,
      rootMargin: margin,
      threshold: moveThresholds(ratio),
    });
    next.observe(element);
    return next;
  }

  function onEntries(entries: IntersectionObserverEntry[]) {
    const entry = entries[entries.length - 1];
    // The viewport size can be different from the size that made the margin,
    // for example because of a scroll bar. Thus, compare a fixed element with
    // its own box. The root bounds move with the root element on scroll.
    const expected = area.fixed ? area.rect : entry.rootBounds;
    if (expected === null || !edgesMatch(entry.boundingClientRect, expected)) {
      onMove();
    } else if (Math.abs(entry.intersectionRatio - ratio) > RATIO_BAND / 2) {
      ratio = entry.intersectionRatio;
      observer.disconnect();
      observer = arm();
    }
  }

  return {
    /** Tells whether this watch already covers the same area. */
    covers: (next: MoveWatchArea) =>
      next.fixed === area.fixed &&
      moveRootMargin(next.rect, next.root) === margin,
    disconnect: () => {
      observer.disconnect();
    },
  };
}

/** @internal */
export type MoveWatch = ReturnType<typeof observeMove>;
