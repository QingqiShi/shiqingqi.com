import type { FrameLoop } from "../motion/create-frame-loop.ts";
import { pondRuns, type PondStoneView } from "./pond-runs.ts";
import { POND, STONE_SLOTS, pondEnd, slopeProfile } from "./pond.ts";

/** A stone dropped in a pond. */
interface Stone {
  readonly x: number;
  readonly y: number;
  /** When its first ring starts, on the clock of the loop. */
  readonly start: number;
  /** How long its rings run, in seconds from `start`. */
  end: number;
  /** Whether a newer stone makes it calm early. */
  calming: boolean;
}

/** The rings that run in one element. */
interface Pond {
  /** Drops `stone` in the pond, with the rings that run already. */
  add(stone: Stone): void;
  /** Stops the rings. */
  stop(): void;
}

const ponds = new WeakMap<HTMLElement, Pond>();

/**
 * Drops a stone at (`x`, `y`) in `element`, in its own px, whose rings
 * start on `loop` after `delay` seconds. The rings of each stone add to the
 * rings that run already, as on water. `pondRuns` gives the effect layer
 * the water as it is at each frame, so that it bends the element's content
 * and lights it.
 *
 * @internal
 */
export function dropStone({
  element,
  loop,
  x,
  y,
  delay,
}: {
  element: HTMLElement;
  loop: FrameLoop;
  x: number;
  y: number;
  delay: number;
}) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (width === 0 || height === 0) return;
  const stone: Stone = {
    x,
    y,
    start: loop.now() + delay,
    end: pondEnd(x, y, width, height),
    calming: false,
  };
  const running = ponds.get(element);
  if (running === undefined) {
    ponds.set(element, startPond(element, loop, stone));
  } else {
    running.add(stone);
  }
}

/**
 * Stops the rings in `element`, if any run.
 *
 * @internal
 */
export function calmPond(element: HTMLElement) {
  ponds.get(element)?.stop();
}

function startPond(element: HTMLElement, loop: FrameLoop, first: Stone): Pond {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const stones: Stone[] = [first];
  let stopped = false;
  let stopAtCalm = () => {};

  function scheduleStop() {
    stopAtCalm();
    const calmAt = Math.max(...stones.map((each) => each.start + each.end));
    stopAtCalm = loop.at(calmAt, stop);
  }
  scheduleStop();

  function show() {
    if (stopped) return null;
    const now = loop.now();
    const shown: PondStoneView[] = [];
    for (const each of stones) {
      const time = now - each.start;
      if (time <= 0 || time >= each.end) continue;
      shown.push({
        x: each.x,
        y: each.y,
        profile: slopeProfile(time, each.end),
      });
    }
    return shown.length === 0 ? null : { width, height, stones: shown };
  }

  pondRuns.set(element, show);

  function stop() {
    if (stopped) return;
    stopped = true;
    stopAtCalm();
    pondRuns.delete(element);
    ponds.delete(element);
  }

  return {
    add(stone) {
      if (stopped) return;
      const now = loop.now();
      stones.splice(
        0,
        stones.length,
        ...stones.filter((each) => each.start + each.end > now),
      );
      const running = stones.filter((each) => !each.calming);
      if (running.length >= POND.stones) {
        const oldest = running[0];
        oldest.calming = true;
        oldest.end = Math.min(
          oldest.end,
          Math.max(0, now - oldest.start) + POND.lastFade,
        );
      }
      stones.push(stone);
      while (stones.length > STONE_SLOTS) stones.shift();
      scheduleStop();
    },
    stop,
  };
}
