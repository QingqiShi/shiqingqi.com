import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decayVelocity,
  smoothVelocity,
  trackPointer,
} from "./track-pointer.ts";

describe("smoothVelocity", () => {
  it("moves part of the way towards a sample, more for a longer gap", () => {
    const short = smoothVelocity(0, 1000, 8);
    const long = smoothVelocity(0, 1000, 50);
    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(1000);
  });

  it("holds a steady velocity", () => {
    expect(smoothVelocity(400, 400, 16)).toBe(400);
  });
});

describe("decayVelocity", () => {
  it("holds through the gap between two events", () => {
    expect(decayVelocity(500, 16)).toBe(500);
  });

  it("falls towards 0 once the pointer stops", () => {
    expect(decayVelocity(500, 100)).toBeLessThan(500);
    expect(decayVelocity(500, 1000)).toBeCloseTo(0, 3);
  });
});

describe("trackPointer", () => {
  let tracker: ReturnType<typeof trackPointer> | null = null;

  afterEach(() => {
    tracker?.destroy();
    tracker = null;
  });

  function dispatch(type: string, init: PointerEventInit) {
    window.dispatchEvent(
      new PointerEvent(type, {
        isPrimary: true,
        pointerType: "mouse",
        ...init,
      }),
    );
  }

  it("reports the primary pointer in page coordinates", () => {
    const onChange = vi.fn();
    tracker = trackPointer(onChange);
    expect(tracker.read(0, 0, 0).present).toBe(false);

    dispatch("pointermove", { clientX: 40, clientY: 60 });
    dispatch("pointermove", { clientX: 400, clientY: 600, isPrimary: false });
    const pointer = tracker.read(5, 1000, performance.now());
    expect(pointer).toMatchObject({
      x: 45,
      y: 1060,
      present: true,
      pressed: false,
    });
    expect(onChange).toHaveBeenCalledOnce();

    dispatch("pointerdown", { clientX: 40, clientY: 60 });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("is pressed between pointerdown and pointerup", () => {
    tracker = trackPointer(() => undefined);
    dispatch("pointerdown", { clientX: 1, clientY: 1 });
    expect(tracker.read(0, 0, 0).pressed).toBe(true);
    dispatch("pointerup", { clientX: 1, clientY: 1 });
    expect(tracker.read(0, 0, 0)).toMatchObject({
      pressed: false,
      present: true,
    });
  });

  it("leaves the page when a finger lifts or a mouse leaves the window", () => {
    tracker = trackPointer(() => undefined);
    dispatch("pointerdown", { clientX: 1, clientY: 1, pointerType: "touch" });
    expect(tracker.read(0, 0, 0).present).toBe(true);
    dispatch("pointerup", { clientX: 1, clientY: 1, pointerType: "touch" });
    expect(tracker.read(0, 0, 0).present).toBe(false);

    dispatch("pointermove", { clientX: 1, clientY: 1 });
    dispatch("pointerout", { relatedTarget: null });
    expect(tracker.read(0, 0, 0).present).toBe(false);
  });
});
