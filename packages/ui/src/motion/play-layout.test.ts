import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { layOut } from "../test-support/lay-out.ts";
import { createMotionEngine } from "./create-motion-engine.ts";
import { captureLayout, playLayout } from "./play-layout.ts";

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function translateOf(element: HTMLElement) {
  const match = /^(-?[\d.]+)px (-?[\d.]+)px$/.exec(element.style.translate);
  return match === null ? null : [Number(match[1]), Number(match[2])];
}

function setUp() {
  const origin = document.createElement("div");
  const card = document.createElement("div");
  const label = document.createElement("span");
  card.append(label);
  origin.append(card);
  layOut(origin, { x: 10, y: 10, width: 500, height: 500 });
  layOut(card, { x: 10, y: 10, width: 100, height: 40 });
  layOut(label, { x: 20, y: 20, width: 50, height: 10 });
  return { origin, card, label };
}

describe("captureLayout", () => {
  it("reads each box relative to its origin", () => {
    const { origin, card, label } = setUp();
    const snapshot = captureLayout([card, label], origin);
    expect(snapshot.rectOf(card)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    });
    expect(snapshot.rectOf(label)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 10,
    });
    expect(snapshot.rectOf(origin)).toBeUndefined();
  });
});

describe("playLayout", () => {
  it("springs an element from its old box to its new one, and clears its translate at rest", async () => {
    const engine = createMotionEngine();
    const { origin, card } = setUp();
    const snapshot = captureLayout([card], origin);
    layOut(card, { x: 110, y: 60, width: 100, height: 40 });
    playLayout(engine, snapshot, [card]);
    expect(translateOf(card)).toEqual([-100, -50]);
    await clock.advance(0.1);
    const [x = 0, y = 0] = translateOf(card) ?? [];
    expect(x).toBeGreaterThan(-100);
    expect(x).toBeLessThan(0);
    expect(y).toBeGreaterThan(-50);
    await clock.advance(3);
    expect(card.style.translate).toBe("");
  });

  it("keeps the transform of an element that it moves, while it moves and at rest", async () => {
    const engine = createMotionEngine();
    const { origin, card } = setUp();
    card.style.transform = "rotate(180deg)";
    const snapshot = captureLayout([card], origin);
    layOut(card, { x: 110, y: 10, width: 100, height: 40 });
    playLayout(engine, snapshot, [card]);
    expect(translateOf(card)).toEqual([-100, 0]);
    expect(card.style.transform).toBe("rotate(180deg)");
    await clock.advance(0.1);
    expect(card.style.transform).toBe("rotate(180deg)");
    await clock.advance(3);
    expect(card.style.translate).toBe("");
    expect(card.style.transform).toBe("rotate(180deg)");
  });

  it("does not move an element that another style gives a translate, and keeps that translate", async () => {
    const engine = createMotionEngine();
    const { origin, card, label } = setUp();
    card.style.translate = "4px 0px";
    const snapshot = captureLayout([card, label], origin);
    layOut(card, { x: 110, y: 10, width: 100, height: 40 });
    layOut(label, { x: 120, y: 20, width: 50, height: 10 });
    playLayout(engine, snapshot, [card, label]);
    expect(card.style.translate).toBe("4px 0px");
    // The card does not move, so the label takes the whole move.
    expect(translateOf(label)).toEqual([-100, 0]);
    await clock.advance(3);
    expect(card.style.translate).toBe("4px 0px");
  });

  it("gives an element inside one that moves on its own only its own move", () => {
    const engine = createMotionEngine();
    const { origin, card, label } = setUp();
    const snapshot = captureLayout([label], origin);
    layOut(label, { x: 120, y: 40, width: 50, height: 10 });
    playLayout(engine, snapshot, [label], {
      moving: new Map([[card, { dx: -100, dy: 0 }]]),
    });
    expect(translateOf(label)).toEqual([0, -20]);
  });

  it("gives an element inside another that moves only its own move", () => {
    const engine = createMotionEngine();
    const { origin, card, label } = setUp();
    const snapshot = captureLayout([card, label], origin);
    layOut(card, { x: 110, y: 10, width: 100, height: 40 });
    layOut(label, { x: 120, y: 40, width: 50, height: 10 });
    playLayout(engine, snapshot, [card, label]);
    expect(translateOf(card)).toEqual([-100, 0]);
    expect(translateOf(label)).toEqual([0, -20]);
  });

  it("turns an element that moves already from where the screen shows it", async () => {
    const engine = createMotionEngine();
    const { origin, card } = setUp();
    let shown = { x: 10, y: 10 };
    card.getBoundingClientRect = () => {
      const [dx = 0, dy = 0] = translateOf(card) ?? [];
      return DOMRect.fromRect({
        x: shown.x + dx,
        y: shown.y + dy,
        width: 100,
        height: 40,
      });
    };
    const first = captureLayout([card], origin);
    shown = { x: 110, y: 10 };
    playLayout(engine, first, [card]);
    await clock.advance(0.1);
    const [midway = 0] = translateOf(card) ?? [];
    const second = captureLayout([card], origin);
    shown = { x: 10, y: 10 };
    playLayout(engine, second, [card]);
    const [turned = 0] = translateOf(card) ?? [];
    expect(110 + midway).toBeCloseTo(10 + turned, 1);
  });

  it("moves an element again after a destroy of its engine stopped its move", () => {
    const engine = createMotionEngine();
    const { origin, card } = setUp();
    playLayout(engine, captureLayout([card], origin), [card]);
    layOut(card, { x: 110, y: 10, width: 100, height: 40 });
    const snapshot = captureLayout([card], origin);
    playLayout(engine, snapshot, [card]);
    engine.destroy();
    expect(card.style.translate).toBe("");
    layOut(card, { x: 10, y: 10, width: 100, height: 40 });
    playLayout(engine, snapshot, [card]);
    expect(translateOf(card)).toEqual([100, 0]);
  });
});
