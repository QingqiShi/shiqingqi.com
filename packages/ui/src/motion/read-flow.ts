import { beginFlowCheck } from "./begin-flow-check.ts";
import type { FlowMover, FlowShare } from "./create-flow-mover.ts";
import type { MotionValue } from "./create-motion-value.ts";
import { MIN_MOVE } from "./play-layout.ts";
import { writeStyles, type Styles } from "./px.ts";

/** @internal */
export interface FlowStretch {
  readonly share: FlowShare;
  readonly openHeight: number;
  readonly closedHeight: number;
  /** Hide what the surface shows below its lower edge, also when it does not clip. */
  readonly clipsBelow?: boolean;
}

/** @internal */
export interface FlowSurface {
  readonly mover: FlowMover;
  /** Call it in the open layout. */
  read(): void;
  stretch(stretch: FlowStretch): () => void;
}

/** @internal */
export interface FlowBlock {
  readonly element: HTMLElement | null;
  readonly isSticky: boolean;
  readonly place?: (() => void) | undefined;
  readonly mover: FlowMover;
  readonly surface: FlowSurface | null;
}

const blocks = new Set<FlowBlock>();

/** @internal */
export interface PlacedBlock {
  readonly block: FlowBlock;
  readonly element: HTMLElement;
}

let sortedBlocks: readonly PlacedBlock[] | null = null;

/** @internal */
export function addFlowBlock(block: FlowBlock) {
  blocks.add(block);
  sortedBlocks = null;
  return () => {
    blocks.delete(block);
    sortedBlocks = null;
  };
}

/**
 * A keyed reorder keeps each ancestor before its blocks, so only a new set needs a sort.
 *
 * @internal
 */
export function placedBlocks() {
  if (sortedBlocks !== null) return sortedBlocks;
  const placed: PlacedBlock[] = [];
  for (const block of blocks) {
    if (block.element !== null) {
      placed.push({ block, element: block.element });
    }
  }
  placed.sort((first, second) =>
    first.element.compareDocumentPosition(second.element) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );
  sortedBlocks = placed;
  return placed;
}

/** @internal */
export interface FlowOffset {
  readonly dx: number;
  readonly dy: number;
}

const NO_OFFSET: FlowOffset = { dx: 0, dy: 0 };

/** @internal */
export interface FlowParts {
  readonly value: MotionValue;
  readonly root: HTMLElement;
  readonly panel: HTMLElement;
  readonly content: HTMLElement;
  readonly scroller: Element;
}

/** @internal */
export function readScroll(scroller: Element) {
  return {
    top: scroller.scrollTop,
    most:
      scroller.scrollHeight -
      (scroller === document.scrollingElement
        ? window.innerHeight
        : scroller.clientHeight),
  };
}

/**
 * Takes `panel` out of the flow, as `hidden` does. Its content stays in the
 * render tree, because `hidden` starts each CSS animation in it again and loses
 * its scroll offsets.
 *
 * @internal
 */
export function collapse(panel: HTMLElement) {
  const collapsed: Styles = {
    position: "absolute",
    "inline-size": getComputedStyle(panel).width,
    "block-size": "0",
    "overflow-y": "clip",
  };
  const kept: Record<string, string> = {};
  for (const name of Object.keys(collapsed)) {
    kept[name] = panel.style.getPropertyValue(name);
  }
  writeStyles(panel, collapsed);
  return () => {
    writeStyles(panel, kept);
  };
}

/** @internal */
export function readFlow(
  { root, panel, content, scroller }: FlowParts,
  isOpening: boolean,
) {
  const placed = placedBlocks();
  const check =
    process.env.NODE_ENV !== "production"
      ? beginFlowCheck(root, scroller, blocks)
      : null;

  const read = (layout: "open" | "closed") => {
    for (const { block } of placed) block.place?.();
    check?.capture(layout);
    return {
      rects: placed.map(({ element }) => element.getBoundingClientRect()),
      contentHeight: content.getBoundingClientRect().height,
      rootBottom: root.getBoundingClientRect().bottom,
      scroll: readScroll(scroller),
    };
  };
  const readOpen = () => {
    const reading = read("open");
    for (const { block } of placed) block.surface?.read();
    return reading;
  };
  const readClosed = () => {
    if (isOpening) {
      panel.hidden = true;
      const reading = read("closed");
      panel.hidden = false;
      return reading;
    }
    const reopen = collapse(panel);
    const reading = read("closed");
    reopen();
    return reading;
  };

  // Start from the layout that the press finds, as it costs no layout.
  const closedFirst = isOpening ? readClosed() : null;
  const open = readOpen();
  const closed = closedFirst ?? readClosed();
  if (!isOpening) {
    for (const { block } of placed) block.place?.();
    if (closed.scroll.top !== open.scroll.top) {
      scroller.scrollTo({ top: open.scroll.top, behavior: "instant" });
    }
  }

  const shrinksBy = open.scroll.most - closed.scroll.most;
  // Scroll anchoring keeps what the screen shows in place, so nothing moves.
  // The browser anchors only to a box under the top of the screen.
  const isAnchored =
    open.scroll.top - closed.scroll.top > MIN_MOVE &&
    open.rootBottom <
      (scroller === document.scrollingElement
        ? 0
        : scroller.getBoundingClientRect().top);

  const { moves, stretches, offsets } = planFlow(
    placed,
    (index, element) =>
      element !== root && root.contains(element)
        ? null
        : { from: open.rects[index], to: closed.rects[index] },
    (block, element, from, to) => {
      const isHeld =
        isAnchored ||
        (block.isSticky && Math.abs(to.top - from.top) < MIN_MOVE);
      const scrolled = scroller.contains(element)
        ? closed.scroll.top - open.scroll.top
        : 0;
      return {
        dx: isAnchored ? 0 : to.left - from.left,
        dy: isHeld ? 0 : to.top - from.top + scrolled,
      };
    },
    !isAnchored,
  );

  check?.report(offsets, isAnchored);
  return {
    moves,
    stretches,
    contentHeight: open.contentHeight,
    shrinksBy: isAnchored ? 0 : shrinksBy,
    openScroll: open.scroll,
  };
}

/** @internal */
interface FlowStretchPlan {
  readonly element: Element;
  readonly surface: FlowSurface;
  readonly openHeight: number;
  readonly closedHeight: number;
}

/**
 * What each block does to show the box `to` from its box `from` in the layout
 * now: its own offset inside the blocks around it, and the stretch of each
 * surface that changes its height. `rectsOf` gives `null` to leave a block out.
 *
 * @internal
 */
export function planFlow(
  placed: readonly PlacedBlock[],
  rectsOf: (
    index: number,
    element: HTMLElement,
  ) => { readonly from: DOMRect; readonly to: DOMRect } | null,
  offsetOf: (
    block: FlowBlock,
    element: HTMLElement,
    from: DOMRect,
    to: DOMRect,
  ) => FlowOffset,
  canStretch: boolean,
) {
  const offsets = new Map<Element, FlowOffset>();
  const moves: { block: FlowBlock; element: Element; own: FlowOffset }[] = [];
  const stretches: FlowStretchPlan[] = [];
  const stack: { element: Element; offset: FlowOffset }[] = [];

  placed.forEach(({ block, element }, index) => {
    const rects = rectsOf(index, element);
    if (rects === null) return;
    const { from, to } = rects;
    if (from.width === 0 && from.height === 0) return;
    while (
      stack.length > 0 &&
      !stack[stack.length - 1].element.contains(element)
    ) {
      stack.pop();
    }
    const outer = stack.at(-1)?.offset ?? NO_OFFSET;
    const { dx, dy } = offsetOf(block, element, from, to);
    const own = { dx: dx - outer.dx, dy: dy - outer.dy };
    const isMoved = Math.hypot(own.dx, own.dy) >= MIN_MOVE;
    const offset = isMoved ? { dx, dy } : outer;
    if (isMoved) moves.push({ block, element, own });
    offsets.set(element, offset);
    stack.push({ element, offset });
    const { surface } = block;
    if (
      surface !== null &&
      canStretch &&
      Math.abs(to.height - from.height) >= MIN_MOVE
    ) {
      stretches.push({
        element,
        surface,
        openHeight: from.height,
        closedHeight: to.height,
      });
    }
  });

  return { moves, stretches, offsets };
}
