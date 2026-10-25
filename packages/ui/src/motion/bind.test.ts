import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { stubAnimations } from "../test-support/stub-animations.ts";
import { bind, MOVING_ATTRIBUTE } from "./bind.ts";
import { createMotionEngine } from "./create-motion-engine.ts";
import { createMotionValue } from "./create-motion-value.ts";
import { px } from "./px.ts";
import { mixStyle } from "./sample-keyframes.ts";

const FIRM = { response: 0.5, dampingRatio: 1 };
const slide = (x: number) => ({ transform: `translateX(${px(x)})` });

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Lets the task end, where a binding makes the Web Animations of its plays. */
const endTask = () => Promise.resolve();

function setUp(initial = 0) {
  const engine = createMotionEngine();
  const value = createMotionValue(engine, initial, {
    spring: FIRM,
    precision: 0.5,
  });
  const element = document.createElement("div");
  return { engine, value, element };
}

/** The value of `property` that a browser gives `offset` of the way through `keyframes`. */
function keyframeStyleAt(
  keyframes: readonly Keyframe[],
  property: string,
  offset: number,
) {
  const after = keyframes.findIndex(
    (keyframe) => (keyframe.offset ?? 0) >= offset,
  );
  const end = keyframes[after];
  if (after <= 0) return String(end[property]);
  const start = keyframes[after - 1];
  const from = start.offset ?? 0;
  const t = (offset - from) / ((end.offset ?? 1) - from);
  return mixStyle(String(start[property]), String(end[property]), t);
}

function translateOf(style: string | null) {
  return Number.parseFloat(
    /translateX\((-?[\d.]+)px\)/.exec(style ?? "")?.[1] ?? "NaN",
  );
}

describe("bind, writing once a frame", () => {
  it("writes the pose each frame, and keeps the last pose at rest", async () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide });
    expect(element.style.transform).toBe("translateX(0.00px)");
    value.to(100);
    await clock.advance(0.096);
    const midway = translateOf(element.style.transform);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);
    expect(midway).toBeCloseTo(value.get(), 0);
    await clock.advance(3);
    expect(element.style.transform).toBe("translateX(100.00px)");
  });

  it("holds its styles while a value moves, and clears what it wrote at rest", async () => {
    const { value, element } = setUp();
    bind(element, value, {
      pose: slide,
      hold: { "z-index": "1" },
      rest: "clear",
    });
    expect(element.style.transform).toBe("");
    value.to(100);
    expect(element.style.zIndex).toBe("1");
    await clock.advance(0.05);
    expect(element.style.transform).not.toBe("");
    await clock.advance(3);
    expect(element.style.transform).toBe("");
    expect(element.style.zIndex).toBe("");
  });

  it("takes off its held styles when a set stops the motion", async () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide, hold: { "z-index": "1" } });
    value.to(100);
    await clock.advance(0.05);
    value.set(30);
    expect(element.style.zIndex).toBe("");
  });

  it("writes a set at once, as a drag does, also where it clears at rest", () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide, rest: "clear" });
    value.set(42);
    expect(element.style.transform).toBe("translateX(42.00px)");
  });

  it("plays again when any of its values changes target", async () => {
    const { engine, value: x, element } = setUp();
    const y = createMotionValue(engine, 0, { spring: FIRM, precision: 0.5 });
    bind(element, [x, y], {
      pose: (left, top) => ({
        transform: `translate(${px(left)}, ${px(top)})`,
      }),
    });
    x.to(100);
    await clock.advance(0.1);
    y.to(50);
    await clock.advance(3);
    expect(element.style.transform).toBe("translate(100.00px, 50.00px)");
  });

  it("takes its reduced pose for a motion under reduced motion", async () => {
    reduceMotion();
    const { engine, element } = setUp();
    const shown = createMotionValue(engine, 0);
    bind(element, shown, {
      pose: (t) => ({ ...slide(100 * (1 - t)), opacity: String(t) }),
      reducedPose: (t) => ({ opacity: String(t) }),
    });
    shown.to(1, { reduced: { duration: 0.2 } });
    await clock.advance(0.096);
    expect(Number(element.style.opacity)).toBeGreaterThan(0.3);
    expect(Number(element.style.opacity)).toBeLessThan(0.7);
    await clock.advance(1);
    expect(element.style.opacity).toBe("1");
  });

  it("takes off what it wrote on unbind", async () => {
    const { value, element } = setUp();
    const binding = bind(element, value, {
      pose: slide,
      hold: { "z-index": "1" },
    });
    value.to(100);
    await clock.advance(0.05);
    binding.unbind();
    expect(element.style.transform).toBe("");
    expect(element.style.zIndex).toBe("");
    await clock.advance(0.05);
    expect(element.style.transform).toBe("");
  });
});

describe("bind, on Web Animations", () => {
  let animations: ReturnType<typeof stubAnimations>;

  beforeEach(() => {
    animations = stubAnimations();
  });

  afterEach(() => {
    animations.restore();
  });

  it("plays one animation of sampled keyframes from the clock of the engine", async () => {
    const { engine, value, element } = setUp();
    await clock.advance(0.5);
    bind(element, value, { pose: slide });
    const start = engine.loop.now();
    value.to(100);
    await endTask();
    const [animation] = animations.animations;
    expect(animation.options).toMatchObject({ easing: "linear", fill: "both" });
    await clock.advance(0.05);
    expect(performance.now() - Number(animation.startTime)).toBeCloseTo(
      (engine.loop.now() - start) * 1000,
      3,
    );
    expect(animation.options.duration).toBeGreaterThan(0);
    expect(animation.keyframes[0]).toMatchObject({
      offset: 0,
      transform: "translateX(0.00px)",
    });
    expect(animation.keyframes.at(-1)).toMatchObject({
      offset: 1,
      transform: "translateX(100.00px)",
    });
    expect(element.style.transform).toBe("translateX(0.00px)");
  });

  it("starts a motion on the first frame that shows it, and holds the clock at its start until then", async () => {
    animations.restore();
    animations = stubAnimations({ startByHand: true });
    const { engine, value, element } = setUp();
    bind(element, value, { pose: slide });
    const start = engine.loop.now();
    value.to(100);
    await endTask();
    const [animation] = animations.animations;
    expect(animation.startTime).toBeNull();
    expect(engine.loop.now()).toBe(start);
    expect(value.get()).toBe(0);

    animations.start(animation, performance.now() + 30);
    await endTask();
    await clock.advance(0.1);

    const omega = (2 * Math.PI) / FIRM.response;
    const at = 0.07;
    expect(value.get()).toBeCloseTo(
      100 * (1 - (1 + omega * at) * Math.exp(-omega * at)),
      0,
    );
  });

  it("gives a new animation the clock of the motion that plays", async () => {
    const { engine, value, element } = setUp();
    const other = document.createElement("div");
    const second = createMotionValue(engine, 0, { spring: FIRM });
    bind(element, value, { pose: slide });
    bind(other, second, { pose: slide });
    value.to(100);
    await clock.advance(0.1);

    second.to(50);
    await endTask();

    const started = animations.animations.at(-1);
    expect(started?.target).toBe(other);
    expect(started?.startTime).toBeCloseTo(engine.loop.now() * 1000, 3);
  });

  it("puts a style that keeps one value over the motion inline, and not in the keyframes", async () => {
    const { value, element } = setUp();
    bind(element, value, {
      pose: (x) => ({ ...slide(x), "content-visibility": "visible" }),
    });
    value.to(100);
    await endTask();
    const [animation] = animations.animations;
    expect(element.style.getPropertyValue("content-visibility")).toBe(
      "visible",
    );
    expect(
      animation.keyframes.some((keyframe) => "content-visibility" in keyframe),
    ).toBe(false);
    await clock.advance(3);
    expect(element.style.getPropertyValue("content-visibility")).toBe(
      "visible",
    );
  });

  it("plays a property that the compositor cannot move in an animation of its own", async () => {
    const { value, element } = setUp();
    bind(element, value, {
      pose: (x) => ({ ...slide(x), visibility: x > 50 ? "visible" : "hidden" }),
    });
    value.to(100);
    await endTask();
    const [moved, shown] = animations.animations.map(({ keyframes }) =>
      Object.keys(keyframes[0]).sort(),
    );
    expect(moved).toEqual(["offset", "transform"]);
    expect(shown).toEqual(["offset", "visibility"]);
  });

  it("marks the element while a motion moves it", async () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide });
    expect(element.hasAttribute(MOVING_ATTRIBUTE)).toBe(false);
    value.to(100);
    expect(element.hasAttribute(MOVING_ATTRIBUTE)).toBe(true);
    await clock.advance(3);
    expect(element.hasAttribute(MOVING_ATTRIBUTE)).toBe(false);
    value.to(0);
    value.set(20);
    expect(element.hasAttribute(MOVING_ATTRIBUTE)).toBe(false);
  });

  it("starts the new animation before it cancels the old one, from the state of the model", async () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide });
    value.to(100);
    await clock.advance(0.1);
    const at = value.get();
    value.to(0);
    await endTask();
    expect(animations.log).toEqual(["play 0", "play 1", "cancel 0"]);
    const retarget = animations.animations[1];
    expect(translateOf(String(retarget.keyframes[0].transform))).toBeCloseTo(
      at,
      1,
    );
  });

  it("makes one animation of each play in one task", async () => {
    const { engine, value, element } = setUp();
    const other = createMotionValue(engine, 0, { spring: FIRM });
    bind(element, [value, other], {
      pose: (x, y) => ({ transform: `translate(${px(x)}, ${px(y)})` }),
    });
    value.to(100);
    other.to(50);
    await endTask();
    expect(animations.log).toEqual(["play 0"]);
    expect(animations.animations[0].keyframes.at(-1)).toMatchObject({
      transform: "translate(100.00px, 50.00px)",
    });
  });

  it("keeps its last pose inline at rest, and then cancels the animation", async () => {
    const { value, element } = setUp();
    bind(element, value, { pose: slide });
    value.to(100);
    await clock.advance(3);
    expect(element.style.transform).toBe("translateX(100.00px)");
    expect(animations.running(element)).toHaveLength(0);
  });

  it("shows the same pose at each time as the binding that writes once a frame", async () => {
    const { engine, value, element } = setUp();
    const framed = document.createElement("div");
    bind(element, value, { pose: slide });
    bind(framed, value, { pose: slide, renderer: "frame" });
    const start = engine.loop.now();
    value.to(100);
    await endTask();
    const [animation] = animations.animations;
    const length = Number(animation.options.duration) / 1000;
    for (let frame = 0; frame < 30; frame++) {
      await clock.advance(0.016);
      const offset = (engine.loop.now() - start) / length;
      const played = translateOf(
        keyframeStyleAt(animation.keyframes, "transform", Math.min(1, offset)),
      );
      expect(
        Math.abs(played - translateOf(framed.style.transform)),
      ).toBeLessThan(0.3);
    }
  });

  it("measures with no pose it wrote, and then plays again from the model", async () => {
    const { engine, value, element } = setUp();
    const still = document.createElement("div");
    const resting = createMotionValue(engine, 30);
    bind(element, value, { pose: slide });
    bind(still, resting, { pose: slide });
    value.to(100);
    await clock.advance(0.1);
    const seen = engine.measure(() => ({
      moving: animations.running(element).length,
      still: still.style.transform,
    }));
    expect(seen).toEqual({ moving: 0, still: "" });
    expect(still.style.transform).toBe("translateX(30.00px)");
    await endTask();
    expect(animations.log).toEqual(["play 0", "cancel 0", "play 1"]);
    expect(
      translateOf(String(animations.animations[1].keyframes[0].transform)),
    ).toBeCloseTo(value.get(), 1);
  });

  it("keeps the styles of now other than transforms while it measures", async () => {
    const { engine, value, element } = setUp();
    bind(element, value, {
      pose: (x) => ({ ...slide(x), visibility: x > 50 ? "visible" : "hidden" }),
      renderer: "frame",
    });
    value.to(100);
    await clock.advance(0.3);
    const seen = engine.measure(() => ({
      transform: element.style.transform,
      visibility: element.style.visibility,
    }));
    expect(seen).toEqual({ transform: "", visibility: "visible" });
    expect(translateOf(element.style.transform)).toBeCloseTo(value.get(), 1);
  });

  it("does not play again a binding that the measure took off", async () => {
    const { engine, value, element } = setUp();
    const binding = bind(element, value, { pose: slide, renderer: "frame" });
    value.to(100);
    await clock.advance(0.1);
    engine.measure(() => {
      binding.unbind();
    });
    expect(element.style.transform).toBe("");
    await clock.advance(0.1);
    expect(element.style.transform).toBe("");
  });
});
