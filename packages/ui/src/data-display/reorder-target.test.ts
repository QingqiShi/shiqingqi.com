import { describe, expect, it } from "vitest";
import { reorderTarget } from "./reorder-target.ts";

// A short row, a tall row and a short row, with gaps of 10px.
const rows = [
  { top: 0, height: 40 },
  { top: 50, height: 140 },
  { top: 200, height: 40 },
];

describe("reorderTarget", () => {
  it("passes a row once its leading edge passes the middle of that row", () => {
    expect(reorderTarget(rows, 0, 79, 0, 2)).toBe(0);
    expect(reorderTarget(rows, 0, 81, 0, 2)).toBe(1);
    expect(reorderTarget(rows, 0, 181, 0, 2)).toBe(2);
    expect(reorderTarget(rows, 2, 121, 0, 2)).toBe(2);
    expect(reorderTarget(rows, 2, 119, 0, 2)).toBe(1);
    expect(reorderTarget(rows, 2, 19, 0, 2)).toBe(0);
  });

  it("reaches each end of its run at the end of the drag", () => {
    expect(reorderTarget(rows, 0, 200, 0, 2)).toBe(2);
    expect(reorderTarget(rows, 2, 0, 0, 2)).toBe(0);
  });

  it("stays inside its run, past a row that cannot move", () => {
    expect(reorderTarget(rows, 0, 500, 0, 1)).toBe(1);
    expect(reorderTarget(rows, 2, -500, 1, 2)).toBe(1);
  });
});
