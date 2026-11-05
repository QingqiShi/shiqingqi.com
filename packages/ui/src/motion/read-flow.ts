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

interface PlacedBlock {
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

/** A keyed reorder keeps each ancestor before its blocks, so only a new set needs a sort. */
function placedBlocks() {
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

  const offsets = new Map<Element, FlowOffset>();
  const moves: { block: FlowBlock; element: Element; own: FlowOffset }[] = [];
  const stretches: {
    element: Element;
    surface: FlowSurface;
    openHeight: number;
    closedHeight: number;
  }[] = [];
  const stack: { element: Element; offset: FlowOffset }[] = [];

  placed.forEach(({ block, element }, index) => {
    if (element !== root && root.contains(element)) return;
    const from = open.rects[index];
    const to = closed.rects[index];
    if (from.width === 0 && from.height === 0) return;
    while (
      stack.length > 0 &&
      !stack[stack.length - 1].element.contains(element)
    ) {
      stack.pop();
    }
    const outer = stack.at(-1)?.offset ?? NO_OFFSET;
    const isHeld =
      isAnchored || (block.isSticky && Math.abs(to.top - from.top) < MIN_MOVE);
    const dx = isAnchored ? 0 : to.left - from.left;
    const scrolled = scroller.contains(element)
      ? closed.scroll.top - open.scroll.top
      : 0;
    const dy = isHeld ? 0 : to.top - from.top + scrolled;
    const own = { dx: dx - outer.dx, dy: dy - outer.dy };
    const isMoved = Math.hypot(own.dx, own.dy) >= MIN_MOVE;
    const offset = isMoved ? { dx, dy } : outer;
    if (isMoved) moves.push({ block, element, own });
    offsets.set(element, offset);
    stack.push({ element, offset });
    const { surface } = block;
    if (
      surface !== null &&
      !isAnchored &&
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

  check?.report(offsets, isAnchored);
  return {
    moves,
    stretches,
    contentHeight: open.contentHeight,
    shrinksBy: isAnchored ? 0 : shrinksBy,
    openScroll: open.scroll,
  };
}
