import { describe, expect, it } from "vitest";
import {
  claimGesture,
  dismissDistance,
  releaseVelocity,
  rubberBand,
  shouldDismiss,
} from "./should-dismiss.ts";

describe("rubberBand", () => {
  it("follows a drag down", () => {
    expect(rubberBand(120)).toBe(120);
  });

  it("resists a drag up more the further it goes, and stops short", () => {
    const near = rubberBand(-20);
    const far = rubberBand(-2000);
    expect(near).toBeLessThan(0);
    expect(near).toBeGreaterThan(-20);
    expect(far).toBeGreaterThan(-64);
    expect(far).toBeLessThan(near);
  });
});

describe("dismissDistance", () => {
  it("is a share of the height, kept between a floor and a cap", () => {
    expect(dismissDistance(0)).toBe(48);
    expect(dismissDistance(400)).toBe(120);
    expect(dismissDistance(2000)).toBe(160);
  });
});

describe("releaseVelocity", () => {
  it("reads the samples of the last 100ms", () => {
    expect(
      releaseVelocity(
        [
          { time: 0, y: 0 },
          { time: 400, y: 10 },
          { time: 450, y: 20 },
          { time: 500, y: 70 },
        ],
        500,
      ),
    ).toBe(0.6);
  });

  it("falls while the pointer stays still before it lets go", () => {
    const samples = [
      { time: 0, y: 0 },
      { time: 50, y: 30 },
      { time: 100, y: 60 },
    ];
    expect(releaseVelocity(samples, 100)).toBe(0.6);
    expect(releaseVelocity(samples, 150)).toBe(0.3);
    expect(releaseVelocity(samples, 400)).toBe(0);
  });

  it("is 0 with one sample", () => {
    expect(releaseVelocity([{ time: 0, y: 10 }], 0)).toBe(0);
  });
});

describe("shouldDismiss", () => {
  it("closes past the distance", () => {
    expect(shouldDismiss(130, 0, 400)).toBe(true);
  });

  it("closes on a flick down", () => {
    expect(shouldDismiss(30, 0.8, 400)).toBe(true);
  });

  it("keeps a short, slow drag open", () => {
    expect(shouldDismiss(30, 0.1, 400)).toBe(false);
  });

  it("keeps a tap with a jitter open, however fast", () => {
    expect(shouldDismiss(4, 2, 400)).toBe(false);
  });

  it("keeps it open on a flick up", () => {
    expect(shouldDismiss(200, -1, 400)).toBe(false);
  });
});

describe("claimGesture", () => {
  it("waits until the pointer moves", () => {
    expect(claimGesture("content", 0, 0, 0)).toBe("wait");
  });

  it("drags on a pull down of the content at its top", () => {
    expect(claimGesture("content", 1, 6, 0)).toBe("drag");
  });

  it("drags on a pull down of the content while iOS stretches it past its top", () => {
    expect(claimGesture("content", 0, 6, -12)).toBe("drag");
  });

  it("scrolls the content on a pull down when it is scrolled", () => {
    expect(claimGesture("content", 0, 6, 40)).toBe("release");
  });

  it("scrolls the content on a push up at its top", () => {
    expect(claimGesture("content", 0, -6, 0)).toBe("release");
  });

  it("leaves a sideways move to the browser", () => {
    expect(claimGesture("content", 8, 6, 0)).toBe("release");
    expect(claimGesture("top-row", 8, 6, 0)).toBe("release");
  });

  it("drags from the top row and the grabber, however far the content is scrolled", () => {
    expect(claimGesture("top-row", 0, 6, 400)).toBe("drag");
    expect(claimGesture("top-row", 0, -6, 400)).toBe("drag");
    expect(claimGesture("grabber", 0, 6, 400)).toBe("drag");
  });
});
