import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import type { MotionValue } from "../../motion/create-motion-value.ts";
import { smoothstep } from "../../motion/mix.ts";
import { springRoles } from "../../motion/spring-roles.ts";
import { show, springValue } from "./show.ts";
import type { Part, ShownMark } from "./types.ts";

/** Where on its way the rest of a Shared element that holds others starts to show. */
const LATE_FROM = 0.7;
/** How long, in seconds, a Shared element that holds others waits for the new form to draw them. */
const PART_WAIT = 0.25;

/** @internal */
interface WaitingPart {
  readonly name: string;
  readonly from: ShownMark;
}

/** @internal */
export interface LandedPart {
  readonly name: string;
  readonly from: ShownMark;
  readonly to: ShownMark;
}

/**
 * A Shared element that holds others, such as a chart that holds its line
 * and its labels: the ones it holds fly on their own, the form it leaves
 * stays where it is, and the rest of the form it goes to shows only as
 * they land. A new form can draw what it holds a moment after it mounts,
 * such as a chart that measures its width first, so the motion waits for
 * the parts that it has not drawn yet, and they set off together.
 *
 * @internal
 */
export interface Holder extends Part {
  readonly progress: MotionValue;
  readonly isWaiting: boolean;
  /** The waiting parts that `find` finds in the new form now, which stop waiting. */
  land(find: (name: string, within: Element) => ShownMark | null): LandedPart[];
}

/** @internal */
export function createHolder(
  engine: MotionEngine,
  destination: ShownMark,
  parts: readonly WaitingPart[],
): Holder {
  const { loop } = engine;
  const progress = springValue(engine, 0, springRoles.move);
  const startedAt = loop.now();
  let waiting = parts;
  progress.to(1, { delay: waiting.length > 0 ? PART_WAIT : 0 });
  const binding = show(destination.element, progress, (p) => ({
    opacity: smoothstep(LATE_FROM, 1, p).toFixed(3),
  }));
  const isWaiting = () =>
    waiting.length > 0 && loop.now() - startedAt <= PART_WAIT;
  return {
    progress,
    get isWaiting() {
      return isWaiting();
    },
    land(find) {
      if (!isWaiting()) return [];
      const landed: LandedPart[] = [];
      waiting = waiting.filter(({ name, from }) => {
        const to = find(name, destination.element);
        if (to === null) return true;
        landed.push({ name, from, to });
        return false;
      });
      if (waiting.length === 0) progress.to(1);
      return landed;
    },
    isMoving: () => progress.isMoving,
    drop() {
      binding.unbind();
      progress.stop();
    },
  };
}
