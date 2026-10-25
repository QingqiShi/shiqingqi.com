import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { bind, type BindOptions } from "./bind.ts";
import type { MotionValue } from "./create-motion-value.ts";

/**
 * Binds `values` to the element in `ref` while the component is mounted.
 * It binds once, so `values`, `hold`, `rest` and `renderer` must not change;
 * `pose` and `reducedPose` come from the latest render.
 */
export function useBinding(
  ref: RefObject<HTMLElement | SVGElement | null>,
  values: MotionValue | readonly MotionValue[],
  options: BindOptions,
): void {
  const pose = useEffectEvent((...at: number[]) => options.pose(...at));
  const reducedPose = useEffectEvent((...at: number[]) =>
    (options.reducedPose ?? options.pose)(...at),
  );
  const start = useEffectEvent((element: HTMLElement | SVGElement) =>
    bind(element, values, { ...options, pose, reducedPose }),
  );
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const binding = start(element);
    return () => {
      binding.unbind();
    };
  }, [ref]);
}
