import { describe, expect, it } from "vitest";
import { FOREGROUND_DARK, FOREGROUND_LIGHT } from "./constants.ts";
import { pickForeground } from "./pick-foreground.ts";

describe("pickForeground", () => {
  it("returns white on dark backgrounds", () => {
    expect(pickForeground("#000000")).toBe(FOREGROUND_LIGHT);
    expect(pickForeground("#400001")).toBe(FOREGROUND_LIGHT);
  });

  it("returns black on light/mid backgrounds where black has higher contrast", () => {
    // Yellow 50 — the case from the review finding. White is 2.69:1, black is far higher.
    expect(pickForeground("#C09900")).toBe(FOREGROUND_DARK);
    expect(pickForeground("#FFFFFF")).toBe(FOREGROUND_DARK);
  });
});
