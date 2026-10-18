import type { Edges } from "./observe-move.ts";
import {
  readInset,
  readInsets,
  scrollerPadding,
  stickyViewOf,
  type Insets,
} from "./read-element-box.ts";

/** Two px positions are the same within this distance. */
const STUCK_TOLERANCE = 0.5;

/**
 * How far a sticky box is from its sticky offset, in px: the least distance
 * of an edge from its offset to the same edge of `scrollport`, the box it
 * sticks to, in viewport coordinates. A fixed box counts as a sticky box, so
 * that a box that is fixed at one breakpoint and sticky at another is one
 * sticky carrier. It is `Infinity` for a box that is neither, for a box with
 * no box, and for a box with no sticky offset.
 *
 * @internal
 */
export function stuckDistance(
  box: Element,
  scrollport: Edges,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  const { position } = styleOf(box);
  if (position !== "sticky" && position !== "fixed") {
    return Infinity;
  }
  const insets = readInsets(box, styleOf);
  const rect = box.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return Infinity;
  }
  const from = (inset: string, gap: number) => {
    const offset = readInset(inset);
    return offset === null ? Infinity : Math.abs(gap - offset);
  };
  return Math.min(
    from(insets.top, rect.top - scrollport.top),
    from(insets.bottom, scrollport.bottom - rect.bottom),
    from(insets.left, rect.left - scrollport.left),
    from(insets.right, scrollport.right - rect.right),
  );
}

const NO_PADDING: Edges = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * The root margins that tell when a sticky box can stick or let go, as CSS
 * margins, top first and then clockwise. `box` shrinks the scroller by each
 * sticky offset and 1px more, so the box leaves that root by 1px when it
 * sticks. `container` shrinks the scroller by each sticky offset and the
 * box's size, so the box's container leaves that root when its end pushes
 * the box out. `container` is `null` for a box with no sticky offset. Each
 * offset counts from the scroller's `padding`, where a sticky box stops.
 *
 * @internal
 */
export function stuckRootMargins(
  insets: Insets,
  size: { readonly width: number; readonly height: number },
  padding: Edges = NO_PADDING,
) {
  const sides = [
    [insets.top, size.height, padding.top],
    [insets.right, size.width, padding.right],
    [insets.bottom, size.height, padding.bottom],
    [insets.left, size.width, padding.left],
  ] as const;
  const offsets = sides.map(([inset, length, pad]) => {
    const offset = readInset(inset);
    return offset === null ? null : { offset: offset + pad, length };
  });
  const margin = (shrink: (offset: number, length: number) => number) =>
    offsets
      .map((side) =>
        side === null
          ? "0px"
          : `${String(-Math.ceil(shrink(side.offset, side.length)))}px`,
      )
      .join(" ");
  return {
    box: margin((offset) => offset + 1),
    container: offsets.every((side) => side === null)
      ? null
      : margin((offset, length) => offset + length),
  };
}

/**
 * Calls `onChange` when a sticky box can have stuck to its scroller or let
 * go of it: the viewport for `root` `null`, or else the scroller `root` of a
 * Scroll region. It adds no element to the page. One
 * `IntersectionObserver` watches the box against the scroller less its
 * sticky offsets, and one watches the box's container against the scroller
 * less the offsets and the box's size, for the end of the container that
 * pushes the box out. A call only signals. `watchStuck` then reads whether
 * the box is stuck.
 *
 * @internal
 */
export function observeStuck(
  box: Element,
  onChange: () => void,
  root: Element | null = null,
) {
  let observers: IntersectionObserver[] = [];
  let size = { width: 0, height: 0 };
  let armed: ReturnType<typeof stuckRootMargins> | null = null;

  function disconnect() {
    for (const observer of observers) {
      observer.disconnect();
    }
    observers = [];
  }

  function arm() {
    const { width, height } = box.getBoundingClientRect();
    size = { width, height };
    const margins = stuckRootMargins(
      readInsets(box),
      size,
      root === null ? NO_PADDING : scrollerPadding(root),
    );
    if (
      observers.length > 0 &&
      armed?.box === margins.box &&
      armed.container === margins.container
    ) {
      return;
    }
    disconnect();
    armed = margins;
    // An observer reports the state at once when it starts to observe.
    // Thus, skip that first report, and report a change only after it.
    const watch = (
      target: Element,
      rootMargin: string,
      threshold: number[],
    ) => {
      let started = false;
      const observer = new IntersectionObserver(
        () => {
          if (started) {
            onChange();
          }
          started = true;
        },
        { root, rootMargin, threshold },
      );
      observer.observe(target);
      observers.push(observer);
    };
    watch(box, margins.box, [0, 1]);
    const container = box.parentElement;
    if (margins.container !== null && container !== null) {
      watch(container, margins.container, [0]);
    }
  }

  // The first notice comes with the size that `arm` read already.
  const resizeObserver = new ResizeObserver((entries) => {
    const next = entries.at(-1)?.borderBoxSize.at(0);
    if (
      next === undefined ||
      next.inlineSize !== size.width ||
      next.blockSize !== size.height
    ) {
      arm();
      onChange();
    }
  });
  resizeObserver.observe(box, { box: "border-box" });
  arm();

  return {
    /** Watches again when the box's offsets or size changed. */
    rearm: arm,
    disconnect: () => {
      resizeObserver.disconnect();
      disconnect();
    },
  };
}

/**
 * A sticky box nearer than this to its sticky offset can stick or let go with
 * no notice from `observeStuck`: a notice comes when the box crosses a line
 * up to 2px from its offset, and a scroll can stop the box between the line
 * and the offset.
 */
const NEAR_OFFSET = 2;

/**
 * Whether a sticky box is stuck to its scroller, and a call to `onChange`
 * each time that changes: the viewport for `scroller` `null`, or else the
 * scroller of a Scroll region. It is the one stuck state of the box: the
 * plane of the box and the `<canvas>` element of its effects both follow it.
 * It reads the box when `observeStuck` signals, after a resize, and on each
 * scroll of its scroller while the box is near its sticky offset, which
 * includes the time it is stuck. Without `IntersectionObserver` or
 * `ResizeObserver`, it reads the box on each scroll.
 *
 * @internal
 */
export function watchStuck(
  box: Element,
  onChange: (stuck: boolean) => void,
  scroller: Element | null = null,
) {
  const root = document.documentElement;
  let stuck = false;
  let isNear = false;
  let frame = 0;

  function readScrollport() {
    return scroller === null
      ? { left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight }
      : stickyViewOf(scroller);
  }

  function read() {
    const distance = stuckDistance(box, readScrollport());
    isNear = watch === null || distance <= NEAR_OFFSET;
    const next = distance <= STUCK_TOLERANCE;
    if (next !== stuck) {
      stuck = next;
      onChange(stuck);
    }
  }

  function onScroll() {
    if (isNear) {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    }
  }

  function onResize() {
    watch?.rearm();
    read();
  }

  const watch =
    typeof IntersectionObserver === "undefined" ||
    typeof ResizeObserver === "undefined"
      ? null
      : observeStuck(box, read, scroller);
  const listeners = new AbortController();
  const passive = { passive: true, signal: listeners.signal };
  (scroller ?? document).addEventListener("scroll", onScroll, passive);
  window.addEventListener("resize", onResize, passive);
  read();

  return {
    isStuck: () => stuck,
    disconnect: () => {
      watch?.disconnect();
      listeners.abort();
      cancelAnimationFrame(frame);
    },
  };
}
