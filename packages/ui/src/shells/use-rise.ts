import { useLayoutEffect, useRef } from "react";
import { bind } from "../motion/bind.ts";
import type { Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { space } from "../tokens.stylex.ts";

const RISE_SPRING = springOf(springRoles.surface);

/** The new screen at `t` of its rise: it fades in as it rises `space._7` into place. */
function risePose(t: number): Styles {
  return {
    opacity: t.toFixed(3),
    transform: `translateY(calc(${(1 - t).toFixed(4)} * ${space._7}))`,
  };
}

/**
 * Makes the screen in `content` rise into place each time `screen` changes
 * after the first render. Under reduced motion it stays still.
 *
 * @internal
 */
export function useRise(content: HTMLElement | null, screen: unknown) {
  const engine = useMotionEngine();
  const rise = useMotionValue(engine, 1, { spring: RISE_SPRING });
  useLayoutEffect(() => {
    if (content === null) return;
    const binding = bind(content, rise, { pose: risePose, rest: "clear" });
    return () => {
      binding.unbind();
    };
  }, [content, rise]);
  const shownRef = useRef(screen);
  useLayoutEffect(() => {
    if (shownRef.current === screen) return;
    shownRef.current = screen;
    if (engine.reducedMotion) return;
    rise.set(0);
    rise.to(1);
  }, [engine, rise, screen]);
}
