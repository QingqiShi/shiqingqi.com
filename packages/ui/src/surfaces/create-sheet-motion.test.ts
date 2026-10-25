import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMotionEngine } from "../motion/create-motion-engine.ts";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { layOut } from "../test-support/lay-out.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { createSheetMotion } from "./create-sheet-motion.ts";

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("screen", { height: 844 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setUp() {
  const card = document.createElement("div");
  const mover = document.createElement("div");
  const dim = document.createElement("div");
  mover.append(card);
  document.body.append(mover, dim);
  layOut(card, { x: 12, y: 400, width: 366, height: 380 });
  const progress: number[] = [];
  const onLeft = vi.fn(() => progress.at(-1));
  const motion = createSheetMotion(
    createMotionEngine(),
    { card, mover, dim },
    {
      liftFrom: () => null,
      liftContent: () => [],
      onLeft,
      onProgress: (value) => progress.push(value),
    },
  );
  return { motion, mover, onLeft };
}

describe("createSheetMotion", () => {
  it("tells the page that the card is away before it calls onLeft", async () => {
    reduceMotion();
    const { motion, onLeft } = setUp();
    motion.show(true);
    await clock.advance(1);

    motion.show(false);
    await clock.advance(1);

    expect(onLeft).toHaveBeenCalledOnce();
    expect(onLeft).toHaveReturnedWith(0);
  });

  it("keeps the card upright when it turns to rise from far down the screen", async () => {
    let isWide = false;
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => {
      const list = real(query);
      Object.defineProperty(list, "matches", {
        value: query.includes("min-width") && isWide,
      });
      return list;
    });
    const { motion, mover } = setUp();
    motion.show(true);
    await clock.advance(1);
    motion.show(false);
    await clock.advance(0.1);

    isWide = true;
    motion.show(true);

    const scale = Number(/scale\(([-\d.]+)\)/.exec(mover.style.transform)?.[1]);
    expect(scale).toBeGreaterThanOrEqual(0.94);
    expect(scale).toBeLessThanOrEqual(1);
  });
});
