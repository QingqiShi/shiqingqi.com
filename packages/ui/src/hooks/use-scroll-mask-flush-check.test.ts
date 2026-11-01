import { describe, expect, it } from "vitest";
import { flushViolations } from "./use-scroll-mask-flush-check.ts";

const card = { top: 0, right: 400, bottom: 300, left: 0 };

describe("flushViolations", () => {
  it("accepts a mask flush against its container on the fading axis", () => {
    const masked = { top: 24, right: 400.5, bottom: 120, left: 0.5 };
    expect(flushViolations(masked, card, ["horizontal"])).toEqual([]);
  });

  it("reports each edge inset from its container on the fading axis", () => {
    const masked = { top: 0, right: 384, bottom: 300, left: 16 };
    expect(flushViolations(masked, card, ["horizontal"])).toEqual([
      { side: "left", inset: 16 },
      { side: "right", inset: 16 },
    ]);
  });

  it("ignores an inset on the axis that does not fade", () => {
    const masked = { top: 16, right: 400, bottom: 200, left: 0 };
    expect(flushViolations(masked, card, ["horizontal"])).toEqual([]);
    expect(flushViolations(masked, card, ["vertical"])).toEqual([
      { side: "top", inset: 16 },
      { side: "bottom", inset: 100 },
    ]);
  });
});
