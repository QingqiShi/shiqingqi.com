import { useEffect, useLayoutEffect, useState } from "react";
import { FLOW_SPRING, flowEngine } from "./create-flow-motion.ts";
import { bindOnceAfter } from "./create-flow-mover.ts";
import { createMotionValue } from "./create-motion-value.ts";
import { MIN_MOVE } from "./play-layout.ts";
import {
  placedBlocks,
  planFlow,
  type FlowBlock,
  type PlacedBlock,
} from "./read-flow.ts";

const ownShare = (at: number) => at;

function readBlocks(placed: readonly PlacedBlock[]) {
  const rects = new Map<FlowBlock, DOMRect>();
  for (const { block, element } of placed) {
    block.place?.();
    rects.set(block, element.getBoundingClientRect());
  }
  return rects;
}

function createFlowChange() {
  const running = new Set<() => void>();
  let pending: Map<FlowBlock, DOMRect> | null = null;

  /** Reads each block before the change. Returns false under reduced motion. */
  function capture() {
    const engine = flowEngine();
    if (engine.reducedMotion) return false;
    pending = engine.measure(() => readBlocks(placedBlocks()));
    return true;
  }

  /** Call it in the commit of the change. */
  function play() {
    const before = pending;
    pending = null;
    if (before === null) return;
    const engine = flowEngine();
    const placed = placedBlocks();
    const after = engine.measure(() => {
      const rects = readBlocks(placed);
      for (const { block } of placed) block.surface?.read();
      return rects;
    });
    const { moves, stretches } = planFlow(
      placed,
      (index) => {
        const { block } = placed[index];
        const from = after.get(block);
        const to = before.get(block);
        return from === undefined || to === undefined ? null : { from, to };
      },
      (_block, _element, from, to) => ({
        dx: to.left - from.left,
        dy: to.top - from.top,
      }),
      true,
    );
    const most = Math.max(
      0,
      ...moves.map(({ own }) => Math.hypot(own.dx, own.dy)),
      ...stretches.map(({ openHeight, closedHeight }) =>
        Math.abs(closedHeight - openHeight),
      ),
    );
    if (most < MIN_MOVE) return;

    const value = createMotionValue(engine, 1, {
      spring: FLOW_SPRING,
      precision: MIN_MOVE / most,
    });
    const releases: (() => void)[] = [];
    bindOnceAfter(() => {
      for (const { block, own } of moves) {
        releases.push(block.mover.add({ value, ...own, shareAt: ownShare }));
      }
      for (const { surface, openHeight, closedHeight } of stretches) {
        releases.push(
          surface.stretch({
            share: {
              value,
              dx: 0,
              dy: closedHeight - openHeight,
              shareAt: ownShare,
            },
            openHeight,
            closedHeight,
            clipsBelow: true,
          }),
        );
      }
    });
    const release = () => {
      if (!running.delete(release)) return;
      value.stop();
      bindOnceAfter(() => {
        for (const drop of releases) drop();
      });
    };
    running.add(release);
    void value.to(0).finished.then(release);
  }

  return {
    capture,
    play,
    stop() {
      for (const release of [...running]) release();
    },
  };
}

/**
 * Gives a function that runs `update`, a state change, and moves each
 * `FlowBlock` on the page from where it shows to its place in the layout that
 * the change commits, as a `Disclosure` does. Each block moves itself on its
 * `translate`. A surface moves its lower edge, and hides its new content below
 * that edge. A new change adds its motion to the motion in progress, so
 * nothing jumps. Under reduced motion, nothing moves.
 */
export function useFlowChange(): (update: () => void) => void {
  const [change] = useState(createFlowChange);
  const [changes, setChanges] = useState(0);
  useLayoutEffect(() => {
    change.play();
  }, [change, changes]);
  useEffect(
    () => () => {
      change.stop();
    },
    [change],
  );
  return (update) => {
    if (change.capture()) {
      setChanges((count) => count + 1);
    }
    update();
  };
}
