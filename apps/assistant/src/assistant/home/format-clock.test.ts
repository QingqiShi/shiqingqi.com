import { describe, expect, it } from "vitest";
import { formatClock } from "./format-clock.ts";

describe("formatClock", () => {
  it("pads the seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(179)).toBe("2:59");
    expect(formatClock(800)).toBe("13:20");
  });
});
