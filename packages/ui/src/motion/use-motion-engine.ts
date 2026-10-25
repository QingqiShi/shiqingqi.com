import { useEffect, useState } from "react";
import {
  createMotionEngine,
  type MotionEngine,
} from "./create-motion-engine.ts";
import { createMotionValue, type MotionValue } from "./create-motion-value.ts";
import type { Spring } from "./spring-roles.ts";

/**
 * An engine for the motion of one component. It stops each motion when the
 * component unmounts.
 */
export function useMotionEngine(): MotionEngine {
  const [engine] = useState(createMotionEngine);
  useEffect(
    () => () => {
      engine.destroy();
    },
    [engine],
  );
  return engine;
}

/**
 * A motion value of `engine` for the life of the component.
 */
export function useMotionValue(
  engine: MotionEngine,
  initial: number,
  options?: { spring?: Spring; precision?: number },
): MotionValue {
  const [value] = useState(() => createMotionValue(engine, initial, options));
  return value;
}
