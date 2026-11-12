import type { FillTrail } from "./create-fill.ts";
import {
  bindOnceAfter,
  createFlowMover,
  type FlowMover,
} from "./create-flow-mover.ts";
import {
  createMotionEngine,
  type MotionEngine,
} from "./create-motion-engine.ts";
import {
  createMotionValue,
  internalsOf,
  type MotionValue,
} from "./create-motion-value.ts";
import { createTrail } from "./create-trail.ts";
import { unit } from "./mix.ts";
import { MIN_MOVE } from "./play-layout.ts";
import { writeStyles } from "./px.ts";
import {
  collapse,
  readFlow,
  readScroll,
  type FlowOffset,
  type FlowParts,
} from "./read-flow.ts";
import { springOf, springRoles, type Spring } from "./spring-roles.ts";

/** @internal */
export const FLOW_SPRING = springOf(springRoles.move);

/**
 * The link that hangs what lies below a panel on the panel.
 *
 * @internal
 */
const TRAIL_SPRING = springOf(springRoles.trail);

/**
 * Only the block axis clips, because a child can have a negative inline margin
 * to extend its fill past the panel. The panel box moves over the trigger, and
 * it must not take the press that interrupts the motion.
 *
 * @internal
 */
export const PANEL_HOLD = {
  "overflow-y": "clip",
  "pointer-events": "none",
} as const;

/** @internal */
export const CONTENT_HOLD = { "pointer-events": "auto" } as const;

let sharedEngine: MotionEngine | null = null;

/** @internal */
export function flowEngine() {
  sharedEngine ??= createMotionEngine();
  return sharedEngine;
}

const closedShare = (at: number) => 1 - at;

const clippedShare = (at: number) => 1 - unit(at);

const ownShare = (at: number) => at;

/**
 * How a thing that the panel moves comes to rest: `rate` is how fast it comes
 * closer, as a share of the way that is left, in 1/s. A thing below the panel
 * trails the panel, and has a `trail`: how it trails, with a `lead`: where the panel is, as a share of the
 * way that is left to the thing, and how fast the panel comes closer, in the
 * same share.
 *
 * @internal
 */
export interface RestRate {
  readonly rate: number;
  readonly trail: FillTrail | null;
}

/** @internal */
export interface FlowMotion {
  aim(closing: boolean): void;
  readTarget<T>(closing: boolean, read: () => T): T;
  /** How `element` comes to rest, below the panel or in it. */
  restRate(element: Element): RestRate;
  /** A new aim drops `done`. */
  settle(done: () => void): void;
  /** Call it in the task that commits the layout at rest. */
  end(): void;
}

const HOVER_CHECK_MS = 100;

const MIN_REST_LEFT = 1e-3;

interface FlowChange {
  readonly mover: FlowMover;
  readonly change: FlowOffset;
}

function createCatchUp(
  value: MotionValue,
  shareAt: (at: number) => number,
  most: number,
) {
  const at = value.get();
  const speed = value.getVelocity();
  const step = 1e-3;
  const catchUp = createMotionValue(flowEngine(), 1 - shareAt(at), {
    spring: FLOW_SPRING,
    precision: MIN_MOVE / most,
  });
  catchUp.set(1 - shareAt(at), {
    velocity: (shareAt(at) - shareAt(at + step * speed)) / step,
  });
  return catchUp;
}

/**
 * Moves what the layout moves when `panel` shows or hides, with no layout during
 * the motion. The layout stays open for all of the motion, and each block shows
 * how far the closed layout has it from the open one. `panel` must show when this
 * is called.
 *
 * @internal
 */
export function createFlowMotion(
  parts: FlowParts,
  isOpening: boolean,
): FlowMotion {
  const { value, panel, content, scroller } = parts;
  const door = [createFlowMover(panel), createFlowMover(content)];
  const trail = createTrail(value, TRAIL_SPRING);
  let target = isOpening ? 1 : 0;
  let isOnFrames = false;
  let releases: (() => void)[] = [];
  let catchUps: { value: MotionValue; releases: (() => void)[] }[] = [];
  let movers: FlowMover[] = [];
  let scrollOfPress: ReturnType<typeof readScroll> | null = null;
  const watched = new Map<Element, number | null>();
  let planned = new Map<FlowMover, FlowOffset>();
  let shrinksBy = 0;
  let stopClamp: (() => void) | null = null;
  let onSettled: (() => void) | null = null;
  let stopHoverChecks: (() => void) | null = null;
  let dropPanelHold: (() => void) | null = null;

  const isAtRest = () =>
    !value.isMoving &&
    !trail.value.isMoving &&
    !catchUps.some((catchUp) => catchUp.value.isMoving);

  /** The binding of the panel ends with `value`, and a catch-up can move on. */
  function holdPanel() {
    const panelStyles = {
      ...PANEL_HOLD,
      opacity: value.target > 0 ? "1" : "0",
    };
    writeStyles(panel, panelStyles);
    writeStyles(content, CONTENT_HOLD);
    dropPanelHold = () => {
      for (const name of Object.keys(panelStyles)) {
        panel.style.removeProperty(name);
      }
      for (const name of Object.keys(CONTENT_HOLD)) {
        content.style.removeProperty(name);
      }
      dropPanelHold = null;
    };
  }

  function checkSettled() {
    if (onSettled === null || !isAtRest()) return;
    const done = onSettled;
    onSettled = null;
    done();
  }

  function addCatchUp(
    changes: readonly FlowChange[],
    leader: MotionValue,
    shareAt: (at: number) => number,
    link?: Spring,
  ) {
    if (changes.length === 0) return;
    const most = Math.max(
      ...changes.map(({ change }) => Math.hypot(change.dx, change.dy)),
    );
    const catchUp = createCatchUp(leader, shareAt, most);
    catchUps.push({
      value: catchUp,
      releases: changes.map(({ mover, change }) =>
        mover.add({ value: catchUp, ...change, shareAt: ownShare }),
      ),
    });
    void catchUp
      .to(0, {
        spring: FLOW_SPRING,
        trail: link === undefined ? undefined : { link },
      })
      .finished.then(checkSettled);
  }

  function watch(elements: ReadonlySet<Element>) {
    for (const element of watched.keys()) {
      if (elements.has(element)) continue;
      watched.delete(element);
      observer?.unobserve(element);
    }
    for (const element of elements) {
      if (watched.has(element)) continue;
      watched.set(element, null);
      observer?.observe(element);
    }
  }

  function play(isFirst: boolean) {
    const flow = flowEngine().measure(() =>
      readFlow(parts, isFirst && isOpening),
    );
    if (isFirst) scrollOfPress = flow.openScroll;
    bindOnceAfter(() => {
      const replaced = releases;
      releases = [];
      shrinksBy = flow.shrinksBy;
      movers = [...door];
      const elements = new Set<Element>([content]);
      const nextPlan = new Map<FlowMover, FlowOffset>();
      const closedChanges: FlowChange[] = [];
      const clippedChanges: FlowChange[] = [];
      const plan = (
        mover: FlowMover,
        { dx, dy }: FlowOffset,
        changes: FlowChange[] | null,
      ) => {
        const last = planned.get(mover);
        nextPlan.set(mover, { dx, dy });
        if (changes === null || isFirst || last === undefined) return;
        const change = { dx: dx - last.dx, dy: dy - last.dy };
        if (Math.hypot(change.dx, change.dy) >= MIN_MOVE) {
          changes.push({ mover, change });
        }
      };

      for (const { block, element, own } of flow.moves) {
        movers.push(block.mover);
        plan(block.mover, own, closedChanges);
        releases.push(
          block.mover.add({ value: trail.value, ...own, shareAt: closedShare }),
        );
        elements.add(element);
      }
      for (const stretch of flow.stretches) {
        const { element, surface, openHeight, closedHeight } = stretch;
        const dy = closedHeight - openHeight;
        movers.push(surface.mover);
        plan(surface.mover, { dx: 0, dy }, closedChanges);
        releases.push(
          surface.stretch({
            share: { value: trail.value, dx: 0, dy, shareAt: closedShare },
            openHeight,
            closedHeight,
          }),
        );
        elements.add(element);
      }
      // Content that got shorter has nothing past the clip to show.
      const lastDoor = planned.get(door[0]);
      const doorChanges =
        lastDoor === undefined || -lastDoor.dy < flow.contentHeight
          ? clippedChanges
          : null;
      door.forEach((mover, index) => {
        const dy = index === 0 ? -flow.contentHeight : flow.contentHeight;
        plan(mover, { dx: 0, dy }, doorChanges);
        releases.push(mover.add({ value, dx: 0, dy, shareAt: clippedShare }));
      });
      addCatchUp(closedChanges, trail.value, closedShare, TRAIL_SPRING);
      addCatchUp(clippedChanges, value, clippedShare);
      planned = nextPlan;
      // A surface with a new stretch keeps its hold and its paint.
      for (const release of replaced) release();
      if (isOnFrames) for (const mover of movers) mover.useFrames();
      watch(elements);
    });
  }

  function releaseMoves() {
    for (const release of releases) release();
    releases = [];
  }

  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) => {
          let isChanged = false;
          for (const { target, borderBoxSize } of entries) {
            const height = watched.get(target);
            const size = borderBoxSize.at(0)?.blockSize ?? 0;
            if (height === undefined) continue;
            if (height !== null && Math.abs(size - height) < MIN_MOVE) continue;
            if (height !== null) isChanged = true;
            watched.set(target, size);
          }
          if (isChanged) play(false);
        });

  /** A browser tests what is under a still pointer only after a layout. */
  function testHover() {
    panel.style.setProperty("min-block-size", "0px");
    requestAnimationFrame(() => {
      panel.style.removeProperty("min-block-size");
    });
  }

  function watchHover() {
    const isHovered = () =>
      movers.some(({ element }) => element?.matches(":hover") === true);
    if (!isHovered()) return;
    const timer = setInterval(() => {
      if (isHovered()) testHover();
      else stopHoverChecks?.();
    }, HOVER_CHECK_MS);
    stopHoverChecks = () => {
      clearInterval(timer);
      stopHoverChecks = null;
    };
  }

  // The bindings of the trail must finish before the end takes them off.
  const stopRestWatch = internalsOf(trail.value).watch({
    plan: () => {},
    rest: () => {
      queueMicrotask(checkSettled);
    },
  });
  play(true);
  watchHover();

  return {
    aim(closing) {
      target = closing ? 0 : 1;
      const scroll = scrollOfPress;
      scrollOfPress = null;
      onSettled = null;
      dropPanelHold?.();
      stopClamp?.();
      stopClamp = null;
      if (!closing || shrinksBy <= 0) return;
      const { top, most } = scroll ?? readScroll(scroller);
      if (top <= most - shrinksBy) return;
      isOnFrames = true;
      for (const mover of movers) mover.useFrames();
      stopClamp = trail.value.subscribe((at) => {
        const allowed = most - shrinksBy * clippedShare(at);
        if (scroller.scrollTop > allowed) {
          scroller.scrollTo({ top: allowed, behavior: "instant" });
        }
      });
    },
    readTarget(closing, read) {
      return flowEngine().measure(() => {
        if (!closing) return read();
        const top = scroller.scrollTop;
        const reopen = collapse(panel);
        const target = read();
        const isClamped = scroller.scrollTop !== top;
        reopen();
        if (isClamped) scroller.scrollTo({ top, behavior: "instant" });
        return target;
      });
    },
    restRate(element) {
      const isBelow =
        !panel.contains(element) &&
        (panel.compareDocumentPosition(element) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0;
      const remaining = (of: MotionValue) => {
        const left = target - of.get();
        const velocity = of.getVelocity();
        return {
          left,
          velocity,
          rate: Math.abs(left) < MIN_REST_LEFT ? 0 : velocity / left,
        };
      };
      const leader = remaining(value);
      if (!isBelow) return { rate: leader.rate, trail: null };
      const own = remaining(trail.value);
      if (own.rate === 0 && Math.abs(own.left) < MIN_REST_LEFT) {
        return { rate: 0, trail: null };
      }
      return {
        rate: own.rate,
        trail: {
          link: TRAIL_SPRING,
          lead: {
            share: leader.left / own.left,
            rate: leader.velocity / own.left,
          },
        },
      };
    },
    settle(done) {
      onSettled = done;
      if (!isAtRest()) holdPanel();
      checkSettled();
    },
    end() {
      stopRestWatch();
      trail.release();
      stopClamp?.();
      stopClamp = null;
      stopHoverChecks?.();
      observer?.disconnect();
      watched.clear();
      dropPanelHold?.();
      bindOnceAfter(() => {
        releaseMoves();
        for (const catchUp of catchUps) {
          for (const release of catchUp.releases) release();
        }
      });
      for (const catchUp of catchUps) catchUp.value.stop();
      trail.value.stop();
      catchUps = [];
      // A close hides the panel in this task, and that is a layout.
      if (value.target > 0) testHover();
    },
  };
}
