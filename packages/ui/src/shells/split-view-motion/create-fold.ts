import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import { smoothstep, unit } from "../../motion/mix.ts";
import { px } from "../../motion/px.ts";
import { springRoles } from "../../motion/spring-roles.ts";
import { show, springValue, unbindAll } from "./show.ts";
import type { Part } from "./types.ts";

/** How far, in px, the text of the folding sidebar drifts towards the strip. */
const FOLD_DRIFT = 22;

/**
 * The two forms of the sidebar while it folds: the full sidebar fades and
 * drifts towards the strip, and the Collapsed sidebar fades in late, as its
 * Shared elements land. `progress` is 1 where the sidebar is folded.
 *
 * @internal
 */
export interface Fold extends Part {
  go(target: 0 | 1, delay: number): void;
}

/** @internal */
export function createFold(
  engine: MotionEngine,
  full: HTMLElement,
  collapsed: HTMLElement,
  initial: number,
): Fold {
  const progress = springValue(engine, initial, springRoles.fold);
  const bindings = [
    show(full, progress, (folded) => ({
      visibility: "visible",
      opacity: (1 - smoothstep(0, 0.35, folded)).toFixed(3),
      transform: `translateX(${px(-FOLD_DRIFT * unit(folded * 3))})`,
    })),
    show(collapsed, progress, (folded) => ({
      visibility: "visible",
      opacity: smoothstep(0.55, 1, folded).toFixed(3),
    })),
  ];
  return {
    go(target, delay) {
      progress.to(target, { delay });
      full.toggleAttribute("data-split-view-leaving", target === 1);
      collapsed.toggleAttribute("data-split-view-leaving", target === 0);
    },
    isMoving: () => progress.isMoving,
    drop() {
      unbindAll(bindings);
      progress.stop();
      for (const form of [full, collapsed]) {
        form.removeAttribute("data-split-view-leaving");
      }
    },
  };
}
