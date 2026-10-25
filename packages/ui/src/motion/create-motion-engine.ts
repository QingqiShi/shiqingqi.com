import { createFrameLoop, type FrameLoop } from "./create-frame-loop.ts";
import { prefersReducedMotion } from "./prefers-reduced-motion.ts";

/**
 * The clock, the frame loop and the registry that the values and the
 * bindings of a group of motion share.
 */
export interface MotionEngine {
  readonly loop: FrameLoop;
  /** Whether the user asks for reduced motion now. */
  readonly reducedMotion: boolean;
  /** Whether a value of the engine moves now. */
  readonly isMoving: boolean;
  /**
   * Runs `read` with every binding of the engine at its layout pose: no
   * transform it wrote is on its element, and its other styles show the
   * pose of now. Then each binding that `read` did not take off plans again
   * from its values, in the same task, so nothing shows the change.
   */
  measure<T>(read: () => T): T;
  /** Calls `listener` each time the last moving value of the engine comes to rest. */
  onRest(listener: () => void): () => void;
  /** Stops every value and takes off every binding. The engine stays usable. */
  destroy(): void;
}

/** What a binding does for `MotionEngine.measure` and `MotionEngine.destroy`. */
interface EngineBinding {
  suspend(): void;
  resume(): void;
  unbind(): void;
}

interface EngineValue {
  stop(): void;
}

interface EngineRegistry {
  addBinding(binding: EngineBinding): () => void;
  setMoving(value: EngineValue, isMoving: boolean): void;
}

const registries = new WeakMap<MotionEngine, EngineRegistry>();

/** @internal */
export function registryOf(engine: MotionEngine): EngineRegistry {
  const registry = registries.get(engine);
  if (registry === undefined) {
    throw new Error("A motion engine must come from createMotionEngine.");
  }
  return registry;
}

export function createMotionEngine(): MotionEngine {
  const loop = createFrameLoop();
  const bindings = new Set<EngineBinding>();
  const moving = new Set<EngineValue>();
  const restListeners = new Set<() => void>();

  const engine: MotionEngine = {
    loop,
    get reducedMotion() {
      return prefersReducedMotion();
    },
    get isMoving() {
      return moving.size > 0;
    },
    measure(read) {
      const suspended = [...bindings];
      for (const binding of suspended) binding.suspend();
      try {
        return read();
      } finally {
        for (const binding of suspended) {
          if (bindings.has(binding)) binding.resume();
        }
      }
    },
    onRest(listener) {
      restListeners.add(listener);
      return () => {
        restListeners.delete(listener);
      };
    },
    destroy() {
      for (const value of [...moving]) value.stop();
      for (const binding of [...bindings]) binding.unbind();
      loop.destroy();
    },
  };

  registries.set(engine, {
    addBinding(binding) {
      bindings.add(binding);
      return () => {
        bindings.delete(binding);
      };
    },
    setMoving(value, isMoving) {
      if (isMoving) {
        moving.add(value);
        return;
      }
      if (!moving.delete(value) || moving.size > 0) return;
      for (const listener of [...restListeners]) listener();
    },
  });
  return engine;
}
