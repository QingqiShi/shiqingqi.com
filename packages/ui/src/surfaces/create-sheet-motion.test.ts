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

function setUp({ liftFrom = null }: { liftFrom?: HTMLElement | null } = {}) {
  const card = document.createElement("div");
  const mover = document.createElement("div");
  const clips = [
    document.createElement("div"),
    document.createElement("div"),
    document.createElement("div"),
  ] as const;
  const dim = document.createElement("div");
  mover.append(clips[0]);
  clips[0].append(clips[1]);
  clips[1].append(clips[2]);
  clips[2].append(card);
  document.body.append(mover, dim);
  layOut(card, { x: 12, y: 400, width: 366, height: 380 });
  const progress: number[] = [];
  const onLeft = vi.fn(() => progress.at(-1));
  const motion = createSheetMotion(
    createMotionEngine(),
    { card, mover, clips, dim, recede: null },
    {
      liftFrom: () => liftFrom,
      liftContent: () => [],
      onLeft,
      onProgress: (value) => progress.push(value),
    },
  );
  return { motion, mover, clips, card, onLeft };
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

  describe("as the card lifts out of an element", () => {
    /** The keyframes that each element plays, as `Element.animate` gets them. */
    let played: Map<Element, Keyframe[][]>;

    beforeEach(() => {
      played = new Map();
      Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value: () => [],
      });
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      Object.defineProperty(HTMLElement.prototype, "animate", {
        configurable: true,
        value(this: HTMLElement, keyframes: Keyframe[]) {
          played.set(this, [...(played.get(this) ?? []), keyframes]);
          return { startTime: null, ready: Promise.resolve(), cancel() {} };
        },
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "animate");
      Reflect.deleteProperty(document, "elementsFromPoint");
    });

    function liftOpen() {
      const row = document.createElement("div");
      document.body.append(row);
      layOut(row, { x: 29, y: 100, width: 332, height: 60 });
      const parts = setUp({ liftFrom: row });
      parts.motion.show(true);
      return parts;
    }

    /** The move of a `translate(x, y)` keyframe, or 0 where it has none. */
    function moveOf(keyframe: Keyframe | undefined) {
      const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
        String(keyframe?.transform ?? ""),
      );
      return {
        x: Number(match?.[1] ?? 0),
        y: Number(match?.[2] ?? 0),
      };
    }

    it("plays every part of the lift as a transform or an opacity, which the compositor moves", async () => {
      const { mover, clips, card } = liftOpen();
      await Promise.resolve();

      for (const element of [mover, ...clips, card]) {
        expect(played.get(element)?.length).toBeGreaterThan(0);
      }
      for (const animations of played.values()) {
        for (const keyframe of animations.flat()) {
          for (const property of Object.keys(keyframe)) {
            expect(["offset", "transform", "opacity"]).toContain(property);
          }
        }
      }
      expect(card.style.clipPath).toBe("");
    });

    it("clips the card to the box of the element with the clip boxes, and leaves the card where the mover puts it", async () => {
      const { clips, card } = liftOpen();
      await Promise.resolve();

      const [right, bottom, left] = clips.map((clip) =>
        moveOf(played.get(clip)?.[0]?.[0]),
      );
      const own = moveOf(played.get(card)?.[0]?.[0]);
      // The card is 366 by 380 px and the element is 332 by 60 px.
      expect(right).toEqual({ x: -34, y: 0 });
      expect(right.x + bottom.x).toBe(-34);
      expect(right.y + bottom.y).toBe(-320);
      expect(right.x + bottom.x + left.x).toBe(0);
      expect(right.y + bottom.y + left.y + own.y).toBe(0);
      expect(clips[0].style.overflow).toBe("clip");
    });

    it("takes the clip off the boxes once the card is at rest", async () => {
      const { clips } = liftOpen();
      await clock.advance(1.5);

      for (const clip of clips)
        expect(clip.getAttribute("style") ?? "").toBe("");
    });
  });
});
