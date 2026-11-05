import * as stylex from "@stylexjs/stylex";
import { bind, type Binding } from "./bind.ts";
import type { MotionValue } from "./create-motion-value.ts";
import { movingMarker } from "./moving-marker.stylex.ts";
import { px, type Styles } from "./px.ts";

/** @internal */
export interface FlowShare {
  readonly value: MotionValue;
  readonly dx: number;
  readonly dy: number;
  readonly shareAt: (at: number) => number;
}

/** @internal */
export interface FlowMover {
  readonly element: HTMLElement | null;
  setElement(element: HTMLElement | null): void;
  add(share: FlowShare): () => void;
  /** A scroll in script must move in step, and the compositor cannot do that. */
  useFrames(): void;
}

const MARKER_CLASSES = (stylex.props(movingMarker).className ?? "")
  .split(" ")
  .filter(Boolean);

let pendingBinds: Set<() => void> | null = null;

/** @internal */
export function bindOnceAfter(run: () => void) {
  const pending = new Set<() => void>();
  pendingBinds = pending;
  try {
    run();
  } finally {
    pendingBinds = null;
    for (const rebind of pending) rebind();
  }
}

const translateTo = (x: number, y: number): Styles => ({
  translate: `${px(x)} ${px(y)}`,
});

/** @internal */
export function createFlowMover(
  first: HTMLElement | null = null,
  opposite: FlowMover | null = null,
  poseAt: (x: number, y: number) => Styles = translateTo,
): FlowMover {
  const shares = new Set<FlowShare>();
  let element = first;
  let binding: Binding | null = null;
  let isMarked = false;
  let isOnFrames = false;

  function mark(next: boolean) {
    if (element === null || next === isMarked || poseAt !== translateTo) return;
    isMarked = next;
    // An anchor in a box that moves makes the browser lay out each frame.
    if (next) element.classList.add(...MARKER_CLASSES);
    else element.classList.remove(...MARKER_CLASSES);
  }

  function rebind() {
    if (pendingBinds !== null) {
      pendingBinds.add(rebind);
      return;
    }
    binding?.unbind();
    binding = null;
    const list = [...shares];
    if (list.length === 0) isOnFrames = false;
    mark(list.length > 0);
    if (element === null || list.length === 0) return;
    binding = bind(
      element,
      list.map(({ value }) => value),
      {
        pose: (...ats) => {
          let x = 0;
          let y = 0;
          list.forEach(({ dx, dy, shareAt }, index) => {
            x += dx * shareAt(ats[index]);
            y += dy * shareAt(ats[index]);
          });
          return poseAt(x, y);
        },
        renderer: isOnFrames ? "frame" : "auto",
      },
    );
  }

  return {
    get element() {
      return element;
    },
    setElement(next) {
      mark(false);
      binding?.unbind();
      binding = null;
      element = next;
      if (shares.size > 0) rebind();
    },
    add(share) {
      const releaseOpposite = opposite?.add({
        ...share,
        dx: -share.dx,
        dy: -share.dy,
      });
      shares.add(share);
      rebind();
      return () => {
        releaseOpposite?.();
        if (shares.delete(share)) rebind();
      };
    },
    useFrames() {
      opposite?.useFrames();
      if (isOnFrames) return;
      isOnFrames = true;
      rebind();
    },
  };
}
