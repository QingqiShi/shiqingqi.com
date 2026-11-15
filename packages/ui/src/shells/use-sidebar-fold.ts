import { useLayoutEffect, useRef, useState } from "react";
import type { MotionValue } from "../motion/create-motion-value.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { createSidebarFold, type SidebarFold } from "./create-sidebar-fold.ts";

/**
 * The motion of the sidebar of a `TabView` between its two forms. Call
 * `pressed` as the visitor presses the button, before the form changes. The
 * first paint and the hydration can also change the form, and they are no
 * motion.
 *
 * @internal
 */
export function useSidebarFold({
  root,
  content,
  layer,
  under,
}: {
  /** The box of the view. Its child with `data-tab-view-rail` is the rail. */
  root: HTMLElement | null;
  content: HTMLElement | null;
  layer: HTMLElement | null;
  under: HTMLElement | null;
}) {
  const engine = useMotionEngine();
  const foldRef = useRef<SidebarFold | null>(null);
  const [press, setPress] = useState<{ id: number; to: "in" | "out" } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (root === null || content === null || layer === null || under === null) {
      return;
    }
    const rail = root.querySelector<HTMLElement>(
      ":scope > [data-tab-view-rail]",
    );
    if (rail === null) return;
    const created = createSidebarFold(engine, {
      root,
      rail,
      content,
      layer,
      under,
    });
    foldRef.current = created;
    return () => {
      created.destroy();
      foldRef.current = null;
    };
  }, [engine, root, content, layer, under]);
  useLayoutEffect(() => {
    if (press !== null) foldRef.current?.play(press.to);
  }, [press]);
  const pressed = (to: "in" | "out") => {
    foldRef.current?.capture(to);
    setPress((last) => ({ id: (last?.id ?? 0) + 1, to }));
  };
  const pressShift = () => foldRef.current?.contentShift() ?? 0;
  const follow = (view: HTMLElement, slide: MotionValue | null) => {
    foldRef.current?.follow(view, slide);
  };
  return { press, pressed, pressShift, follow };
}
