import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { stubAnimations } from "../test-support/stub-animations.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { bind } from "./bind.ts";
import { createMotionEngine } from "./create-motion-engine.ts";
import { createMotionValue } from "./create-motion-value.ts";

const FIRM = { response: 0.5, dampingRatio: 1 };

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createMotionValue", () => {
  it("springs to its target and comes to rest there", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const motion = value.to(1);
    expect(value.isMoving).toBe(true);
    expect(value.target).toBe(1);
    await clock.advance(0.25);
    expect(value.get()).toBeGreaterThan(0.5);
    await clock.advance(2);
    expect(value.get()).toBe(1);
    expect(value.isMoving).toBe(false);
    await expect(motion.finished).resolves.toBe(true);
  });

  it("turns from where it is, at the speed it has, when the target changes", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.15);
    const before = { value: value.get(), velocity: value.getVelocity() };
    expect(before.velocity).toBeGreaterThan(0);
    const first = value.to(0);
    expect(value.get()).toBe(before.value);
    expect(value.getVelocity()).toBe(before.velocity);
    await clock.advance(0.016);
    expect(value.get()).toBeGreaterThan(before.value);
    await clock.advance(2);
    expect(value.get()).toBe(0);
    await expect(first.finished).resolves.toBe(true);
  });

  it("keeps its position and velocity continuous across a retarget", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, {
      spring: { response: 0.4, dampingRatio: 0.7 },
    });
    value.to(100);
    await clock.advance(0.1);
    const step = 0.001;
    const just = { value: value.get(), velocity: value.getVelocity() };
    value.to(-50);
    await clock.advance(step);
    expect(value.get()).toBeCloseTo(just.value + just.velocity * step, 0);
    expect(Math.abs(value.getVelocity() - just.velocity)).toBeLessThan(
      Math.abs(just.velocity) * 0.2,
    );
  });

  it("starts at the velocity it is given", async () => {
    const engine = createMotionEngine();
    const slow = createMotionValue(engine, 300, {
      spring: FIRM,
      precision: 0.5,
    });
    const fast = createMotionValue(engine, 300, {
      spring: FIRM,
      precision: 0.5,
    });
    slow.set(300);
    fast.set(300);
    slow.to(0, { velocity: -500 });
    fast.to(0, { velocity: -3000 });
    expect(slow.getVelocity()).toBe(-500);
    expect(fast.getVelocity()).toBe(-3000);
    await clock.advance(0.048);
    expect(fast.get()).toBeLessThan(slow.get() - 50);
  });

  it("starts from another place, at the speed it has", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.1);
    const velocity = value.getVelocity();
    value.to(0, { from: 5 });
    expect(value.get()).toBe(5);
    expect(value.getVelocity()).toBe(velocity);
  });

  it("finishes with false when a later motion replaces it", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    const first = value.to(1);
    const second = value.to(2);
    value.set(5);
    await expect(first.finished).resolves.toBe(false);
    await expect(second.finished).resolves.toBe(false);
    expect(value.get()).toBe(5);
    expect(value.isMoving).toBe(false);
  });

  it("keeps its motion for its delay, and then turns", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1, { delay: 0.1 });
    expect(value.target).toBe(1);
    await clock.advance(0.08);
    expect(value.get()).toBe(0);
    expect(value.isMoving).toBe(true);
    await clock.advance(0.2);
    expect(value.get()).toBeGreaterThan(0);
  });

  it("stops where it is", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.1);
    const now = value.get();
    value.stop();
    await clock.advance(0.1);
    expect(value.get()).toBe(now);
  });

  it("calls a subscriber each frame while it moves, and once at rest", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const seen: number[] = [];
    value.subscribe((current) => seen.push(current));
    value.to(1);
    await clock.advance(3);
    const frames = seen.length;
    expect(frames).toBeGreaterThan(10);
    expect(seen.at(-1)).toBe(1);
    expect(seen.filter((current) => current === 1)).toHaveLength(1);
    await clock.advance(1);
    expect(seen).toHaveLength(frames);
    value.set(0.5);
    expect(seen.at(-1)).toBe(0.5);
  });

  it("tells the engine when its last moving value comes to rest", async () => {
    const engine = createMotionEngine();
    const a = createMotionValue(engine, 0, { spring: FIRM });
    const b = createMotionValue(engine, 0, {
      spring: { response: 1, dampingRatio: 1 },
    });
    const onRest = vi.fn();
    engine.onRest(onRest);
    a.to(1);
    b.to(1);
    await clock.advance(1);
    expect(a.isMoving).toBe(false);
    expect(engine.isMoving).toBe(true);
    expect(onRest).not.toHaveBeenCalled();
    await clock.advance(2);
    expect(onRest).toHaveBeenCalledTimes(1);
    expect(engine.isMoving).toBe(false);
  });

  it("snaps under reduced motion, and finishes at once", async () => {
    reduceMotion();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    const motion = value.to(1);
    expect(value.get()).toBe(1);
    expect(value.isMoving).toBe(false);
    await expect(motion.finished).resolves.toBe(true);
  });

  it("takes its reduced tween under reduced motion", async () => {
    reduceMotion();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    value.to(1, { reduced: { duration: 0.2 }, velocity: 50 });
    await clock.advance(0.1);
    expect(value.get()).toBeCloseTo(0.5, 1);
    await clock.advance(0.2);
    expect(value.get()).toBe(1);
  });

  it("takes a tween in place of its spring, also under reduced motion", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1, { tween: { duration: 0.2 } });
    await clock.advance(0.1);
    expect(value.get()).toBeCloseTo(0.5, 1);
    reduceMotion();
    value.to(0, { tween: { duration: 0.2 } });
    await clock.advance(0.1);
    expect(value.get()).toBeCloseTo(0.25, 1);
    await clock.advance(0.2);
    expect(value.get()).toBe(0);
  });

  it("starts at its first frame when a long task holds that frame back", () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    const frames = stubFrames();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const seen: number[] = [];
    value.subscribe((at) => seen.push(at));
    value.to(1);

    vi.advanceTimersByTime(100);
    frames.run();

    // The first frame shows 1/60 s of the spring, and not the 100ms that the
    // long task took.
    const omega = (2 * Math.PI) / FIRM.response;
    const firstFrame = 1 - (1 + omega / 60) * Math.exp(-omega / 60);
    expect(seen.at(-1)).toBeCloseTo(firstFrame, 3);
    expect(value.get()).toBeCloseTo(firstFrame, 3);
    vi.unstubAllGlobals();
  });

  describe("after a long frame", () => {
    function setUp() {
      vi.useRealTimers();
      vi.useFakeTimers({
        toFake: ["performance", "setTimeout", "clearTimeout"],
      });
      const frames = stubFrames();
      const engine = createMotionEngine();
      const value = createMotionValue(engine, 0, { spring: FIRM });
      const element = document.createElement("div");
      /** Runs a frame `ms` after the one before. */
      const frame = (ms: number) => {
        vi.advanceTimersByTime(ms);
        frames.run();
      };
      return { value, element, frame };
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("goes on from the frame before, where the page writes it once a frame", () => {
      const { value, element, frame } = setUp();
      bind(element, value, {
        pose: (at) => ({ opacity: at.toFixed(4) }),
        renderer: "frame",
      });
      value.to(1);
      frame(16);
      frame(16);
      const before = value.get();

      frame(200);

      // The long frame shows 1/30 s of motion, and not 200ms.
      expect(value.get() - before).toBeLessThan(0.15);
      expect(Number(element.style.opacity)).toBeCloseTo(value.get(), 3);
    });

    it("keeps to the clock where every frame of the page is slow", () => {
      const { value, element, frame } = setUp();
      bind(element, value, {
        pose: (at) => ({ opacity: at.toFixed(4) }),
        renderer: "frame",
      });
      value.to(1);
      frame(16);
      frame(100);
      const before = value.get();

      frame(100);
      frame(100);

      // The first slow frame shows 1/30 s of motion. The frames after it
      // come at the pace of the page, so each shows 100ms.
      const omega = (2 * Math.PI) / FIRM.response;
      const shown = (at: number) =>
        1 - (1 + omega * at) * Math.exp(-omega * at);
      const lost = 0.1 - 1 / 30;
      expect(value.get()).toBeGreaterThan(before);
      expect(value.get()).toBeCloseTo(shown(0.316 - lost), 2);
    });

    it("turns from where the last frame showed it, when a long task holds the frames back", () => {
      const { value, element, frame } = setUp();
      bind(element, value, {
        pose: (at) => ({ opacity: at.toFixed(4) }),
        renderer: "frame",
      });
      value.to(1);
      frame(16);
      frame(16);
      const shown = Number(element.style.opacity);

      vi.advanceTimersByTime(200);
      value.to(0);

      // One step of motion past the last frame, and not 200ms.
      expect(value.get() - shown).toBeLessThan(0.15);
      expect(value.get()).toBeGreaterThan(shown);
    });

    it("keeps to the clock on the compositor, which runs on in a long task", () => {
      const animations = stubAnimations();
      const { value, element, frame } = setUp();
      bind(element, value, { pose: (at) => ({ opacity: at.toFixed(4) }) });
      value.to(1);
      frame(16);
      const plays = animations.animations.length;

      frame(200);

      expect(animations.animations).toHaveLength(plays);
      const omega = (2 * Math.PI) / FIRM.response;
      const at = 0.216;
      expect(value.get()).toBeCloseTo(
        1 - (1 + omega * at) * Math.exp(-omega * at),
        2,
      );
      animations.restore();
    });
  });

  it("comes to rest when a frame past its end comes before the timer of its end", async () => {
    vi.useRealTimers();
    // The timer of the end runs on the real clock, so that a frame can come
    // first, as it can in a busy page.
    vi.useFakeTimers({ toFake: ["performance"] });
    const frames = stubFrames();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, {
      spring: { response: 0.1, dampingRatio: 1 },
    });
    bind(document.createElement("div"), value, {
      pose: (at) => ({ opacity: at.toFixed(4) }),
      renderer: "frame",
    });
    const frame = (ms: number) => {
      vi.advanceTimersByTime(ms);
      frames.run();
    };
    let isDone = false;
    void value.to(1).finished.then((done) => {
      isDone = done;
    });
    for (let count = 0; count < 6; count++) frame(16);
    frame(400);
    await new Promise((resolve) => setTimeout(resolve, 300));

    for (let count = 0; count < 20; count++) frame(16);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(isDone).toBe(true);
    expect(value.get()).toBe(1);
    vi.unstubAllGlobals();
  });

  it("does not go back from its end when a frame past its end comes before the timer of its end", () => {
    vi.useRealTimers();
    // The timer of the end runs on the real clock, so that the frames come
    // first, as they can in a busy page.
    vi.useFakeTimers({ toFake: ["performance"] });
    const frames = stubFrames();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, {
      spring: { response: 0.1, dampingRatio: 1 },
    });
    const element = document.createElement("div");
    bind(element, value, {
      pose: (at) => ({ opacity: at.toFixed(4) }),
      renderer: "frame",
    });
    const frame = (ms: number) => {
      vi.advanceTimersByTime(ms);
      frames.run();
    };
    value.to(1);
    for (let count = 0; count < 6; count++) frame(16);
    frame(100);
    frame(100);
    const shown = Number(element.style.opacity);

    frame(16);

    expect(value.get()).toBeGreaterThanOrEqual(shown);
    expect(Number(element.style.opacity)).toBeGreaterThanOrEqual(shown);
    vi.unstubAllGlobals();
  });

  it("comes to rest on time in a hidden page, which runs no frames", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    stubFrames();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    bind(document.createElement("div"), value, {
      pose: (at) => ({ opacity: at.toFixed(4) }),
      renderer: "frame",
    });
    let isDone = false;
    void value.to(1).finished.then((done) => {
      isDone = done;
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(isDone).toBe(true);
    expect(value.get()).toBe(1);
    vi.unstubAllGlobals();
  });

  it("keeps its start when its first frame comes in time", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.1);
    const omega = (2 * Math.PI) / FIRM.response;
    expect(value.get()).toBeCloseTo(
      1 - (1 + omega / 10) * Math.exp(-omega / 10),
      3,
    );
  });

  it("stops on destroy of its engine", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const motion = value.to(1);
    await clock.advance(0.1);
    engine.destroy();
    await expect(motion.finished).resolves.toBe(false);
    expect(value.isMoving).toBe(false);
  });
});
