import { registryOf, type MotionEngine } from "./create-motion-engine.ts";
import {
  afterDelay,
  restingPath,
  shiftedPath,
  springPath,
  tweenPath,
  type MotionPath,
  type MotionState,
} from "./spring-path.ts";
import {
  springOf,
  springRoles,
  type Spring,
  type Tween,
} from "./spring-roles.ts";

/**
 * A number that springs to its targets. It reads its value from the exact
 * path of its spring, so it is right at any time, also while a binding
 * plays it on the compositor.
 *
 * @internal
 */
export interface MotionValue {
  get(): number;
  getVelocity(): number;
  /** Where it goes, or where it is at rest. */
  readonly target: number;
  readonly isMoving: boolean;
  /** Puts it at `value`, at rest, with no motion: a drag writes each move with it. */
  set(value: number): void;
  /**
   * Springs to `target` from where it is, at the speed it has. `from`
   * replaces where it is, such as where a moved element shows now, and
   * `velocity` replaces its speed, such as the speed of a drag at its release. After a
   * `delay`, in seconds, it turns to `target`; until then it keeps its
   * motion. Under reduced motion, it snaps to `target`, or takes `reduced`,
   * such as a short fade, in place of the spring. A `tween` replaces the
   * spring always, also under reduced motion, such as for a cross-fade.
   */
  to(
    target: number,
    options?: {
      spring?: Spring;
      tween?: Tween;
      from?: number;
      velocity?: number;
      delay?: number;
      reduced?: "snap" | Tween;
    },
  ): Motion;
  /** Stops it where it is. */
  stop(): void;
  /** Calls `listener` each frame while it moves, once at rest, and on each `set`. */
  subscribe(listener: (value: number) => void): () => void;
}

/** @internal */
export interface Motion {
  /** True when the motion comes to rest at its target, and false when a later motion or `set` replaces it. */
  readonly finished: Promise<boolean>;
}

/**
 * The motion a value has: its path, from `start` on the clock of the engine.
 *
 * @internal
 */
export interface Plan {
  readonly path: MotionPath;
  readonly start: number;
  /** Whether the motion started under reduced motion. */
  readonly reduced: boolean;
}

/** @internal */
export interface PlanWatcher {
  /** Whether the watcher plays the motion on the compositor, which runs on while a long task holds the page. */
  readonly isOnCompositor?: boolean;
  /** The value has a new plan. */
  plan(): void;
  /** The motion of the value came to rest at its target. */
  rest(): void;
}

interface ValueInternals {
  readonly engine: MotionEngine;
  plan(): Plan;
  watch(watcher: PlanWatcher): () => void;
}

const internals = new WeakMap<MotionValue, ValueInternals>();

/** @internal */
export function internalsOf(value: MotionValue): ValueInternals {
  const found = internals.get(value);
  if (found === undefined) {
    throw new Error("A motion value must come from createMotionValue.");
  }
  return found;
}

/** @internal */
export function stateAt({ path, start }: Plan, time: number): MotionState {
  return path.at(time - start);
}

/** @internal */
export function endOf({ path, start }: Plan) {
  return start + path.settleTime;
}

/**
 * Fits a value from 0 to 1, such as a progress or an opacity. A value in px
 * takes 0.5.
 */
const DEFAULT_PRECISION = 1e-3;
/** The most of a motion, in seconds, that the first frame after its start shows. */
const FIRST_FRAME = 1 / 60;
/** The most of a motion, in seconds, that a later frame shows, after a long frame. */
const MAX_FRAME = 1 / 30;
/** How much of each new gap between frames goes into the pace of the frames. */
const PACE_WEIGHT = 0.25;

/**
 * `precision` is how close to its target, in its own units, the value must
 * be to be at rest.
 *
 * @internal
 */
export function createMotionValue(
  engine: MotionEngine,
  initial: number,
  {
    spring = springOf(springRoles.css),
    precision = DEFAULT_PRECISION,
  }: { spring?: Spring; precision?: number } = {},
): MotionValue {
  const { loop } = engine;
  const registry = registryOf(engine);
  const watchers = new Set<PlanWatcher>();
  const listeners = new Set<(value: number) => void>();
  let plan: Plan = {
    path: restingPath(initial),
    start: loop.now(),
    reduced: false,
  };
  let settle: ((done: boolean) => void) | null = null;
  let cancelRest: (() => void) | null = null;
  let stopTicking: (() => void) | null = null;

  const isMovingAt = (time: number) => time < endOf(plan);

  function emit(current: number) {
    for (const listener of [...listeners]) listener(current);
  }

  function stopTick() {
    stopTicking?.();
    stopTicking = null;
  }

  function startTick() {
    stopTicking ??= loop.every(tick);
  }

  function tick(time: number) {
    emit(stateAt(plan, time).value);
    if (!isMovingAt(time)) stopTick();
  }

  function rest() {
    cancelRest = null;
    lastFrame = Math.max(lastFrame, endOf(plan));
    settle?.(true);
    settle = null;
    registry.setMoving(value, false);
    for (const watcher of [...watchers]) watcher.rest();
  }

  /** When the last frame showed the motion, with the share of a long task taken off. */
  let lastFrame = 0;
  let isFirstFrame = true;
  /** When the last frame came, on the clock. */
  let frameTime = 0;
  /** The usual gap between frames, in seconds, or 0 before two frames came. */
  let pace = 0;

  function hasWatcher(isOnCompositor: boolean) {
    for (const watcher of watchers) {
      if ((watcher.isOnCompositor === true) === isOnCompositor) return true;
    }
    return false;
  }
  /** Whether the page shows the value once a frame. */
  const isFramed = () => listeners.size > 0 || hasWatcher(false);

  /**
   * A long task, such as a React commit, can hold back the frames of the
   * page. Then a motion that the page writes once a frame goes on from the
   * frame before, and does not jump to where the clock is: its plan starts
   * later, so that `time` shows at most one step past the last frame. A
   * step is as long as the usual gap between frames, so a page whose every
   * frame is slow keeps to the clock. A motion on the compositor runs on
   * while the page waits, so after its first frame it keeps to the clock.
   * A hidden page shows no frames, so its motion keeps to the clock and
   * comes to rest on time. Gives whether the plan changed.
   */
  function holdTo(time: number) {
    if (plan.path.settleTime === 0 || lastFrame >= endOf(plan)) return false;
    if (document.visibilityState === "hidden") return false;
    if (!isFirstFrame && (hasWatcher(true) || !isFramed())) return false;
    const step = isFirstFrame ? FIRST_FRAME : Math.max(MAX_FRAME, pace);
    const late = time - lastFrame - step;
    if (late <= 0) return false;
    plan = { ...plan, start: plan.start + late };
    lastFrame += late;
    cancelRest?.();
    cancelRest = loop.at(endOf(plan), restDue);
    for (const watcher of [...watchers]) watcher.plan();
    if (isFramed()) loop.read(holdBack);
    return true;
  }

  function restDue() {
    if (!holdTo(loop.now())) rest();
  }

  function holdBack() {
    const time = loop.now();
    holdTo(time);
    if (!isFirstFrame) {
      const gap = time - frameTime;
      pace = pace === 0 ? gap : pace + (gap - pace) * PACE_WEIGHT;
    }
    frameTime = time;
    isFirstFrame = false;
    lastFrame = time;
    if (isMovingAt(time) && isFramed()) loop.read(holdBack);
  }

  /** The state that the screen shows now, as far as the frames went. */
  function stateNow() {
    const time = loop.now();
    holdTo(time);
    return stateAt(plan, time);
  }

  function replace(next: Plan, isMotion: boolean): Motion {
    cancelRest?.();
    cancelRest = null;
    settle?.(false);
    settle = null;
    plan = next;
    for (const watcher of [...watchers]) watcher.plan();
    if (isMovingAt(loop.now())) {
      const finished = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      registry.setMoving(value, true);
      cancelRest = loop.at(endOf(plan), restDue);
      lastFrame = plan.start;
      isFirstFrame = true;
      loop.read(holdBack);
      if (listeners.size > 0) startTick();
      return { finished };
    }
    stopTick();
    emit(next.path.target);
    if (isMotion) {
      rest();
      return { finished: Promise.resolve(true) };
    }
    registry.setMoving(value, false);
    return { finished: Promise.resolve(false) };
  }

  const value: MotionValue = {
    get: () => stateNow().value,
    getVelocity: () => stateNow().velocity,
    get target() {
      return plan.path.target;
    },
    get isMoving() {
      return isMovingAt(loop.now());
    },
    set(to) {
      replace(
        { path: restingPath(to), start: loop.now(), reduced: false },
        false,
      );
    },
    to(
      target,
      {
        spring: own = spring,
        tween,
        from: place,
        velocity,
        delay = 0,
        reduced = "snap",
      } = {},
    ) {
      const state = stateNow();
      const now = loop.now();
      const from = {
        value: place ?? state.value,
        velocity: velocity ?? state.velocity,
      };
      const isReduced = engine.reducedMotion;
      const pathFrom = (start: MotionState) => {
        if (tween !== undefined) return tweenPath(tween, start.value, target);
        if (!isReduced) return springPath(own, start, target, precision);
        return reduced === "snap"
          ? restingPath(target)
          : tweenPath(reduced, start.value, target);
      };
      const delayed = () => {
        const first =
          place === undefined && velocity === undefined
            ? shiftedPath(plan.path, now - plan.start)
            : springPath(spring, from, plan.path.target, precision);
        return afterDelay(first, delay, pathFrom(first.at(delay)));
      };
      const path = delay > 0 ? delayed() : pathFrom(from);
      return replace({ path, start: now, reduced: isReduced }, true);
    },
    stop() {
      value.set(value.get());
    },
    subscribe(listener) {
      listeners.add(listener);
      if (isMovingAt(loop.now())) {
        startTick();
        lastFrame = Math.max(lastFrame, loop.now());
        loop.read(holdBack);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopTick();
      };
    },
  };

  internals.set(value, {
    engine,
    plan: () => plan,
    watch(watcher) {
      watchers.add(watcher);
      if (isMovingAt(loop.now())) {
        lastFrame = Math.max(lastFrame, loop.now());
        loop.read(holdBack);
      }
      return () => {
        watchers.delete(watcher);
      };
    },
  });
  return value;
}
