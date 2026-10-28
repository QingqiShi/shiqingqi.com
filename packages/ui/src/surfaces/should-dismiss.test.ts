import { describe, expect, it } from "vitest";
import { claimGesture, shouldDismiss } from "./should-dismiss.ts";

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
  it("drags on a pull down of the content at its top", () => {
    expect(claimGesture("content", 1, 6, 0)).toBe("drag");
  });

  it("drags on a pull down of the content while iOS stretches it past its top", () => {
    expect(claimGesture("content", 0, 6, -12)).toBe("drag");
  });

  it("scrolls the content on a pull down when it is scrolled", () => {
    expect(claimGesture("content", 0, 6, 40)).toBe("release");
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
