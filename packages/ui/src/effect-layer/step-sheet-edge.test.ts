import { describe, expect, it } from "vitest";
import {
  finiteSheetEdge,
  restingSheetEdge,
  SHEET_EDGE_SAMPLES,
  sheetEdgeEnergy,
  stepSheetEdge,
  type SheetEdgeField,
  type SheetEdgeInput,
} from "./step-sheet-edge.ts";

const STILL: SheetEdgeInput = { cardVelocity: 0, stretch: 0, finger: null };
const FRAME = 1 / 60;

function run(
  field: SheetEdgeField,
  inputs: (time: number) => SheetEdgeInput,
  seconds: number,
) {
  let current = field;
  let highest = field;
  const peaks: number[] = [];
  for (let time = 0; time < seconds; time += FRAME) {
    current = stepSheetEdge(current, inputs(time), FRAME);
    const peak = Math.max(...current.height);
    if (peak > Math.max(...peaks, 0)) {
      highest = current;
    }
    peaks.push(peak);
  }
  return { field: current, highest, peaks };
}

const middle = (field: SheetEdgeField) =>
  field.height[Math.floor(SHEET_EDGE_SAMPLES / 2)];

describe("stepSheetEdge", () => {
  it("rests at rest, with its ends pinned", () => {
    const { field } = run(restingSheetEdge(), () => STILL, 0.5);
    expect(sheetEdgeEnergy(field)).toBe(0);
    expect(field.height[0]).toBe(0);
    expect(field.height.at(-1)).toBe(0);
  });

  it("swells up through the middle when the card stops rising, highest in the middle and symmetric", () => {
    // The card rises at 1500 px/s and stops in one frame.
    const { highest, peaks } = run(
      restingSheetEdge(),
      (time) => ({ ...STILL, cardVelocity: time < FRAME ? -1500 : 0 }),
      0.25,
    );
    expect(Math.max(...peaks)).toBeGreaterThan(6);
    expect(Math.max(...peaks)).toBeLessThan(24);
    // The corners hold the ends, and the fronts run in from them, so the
    // swell is a plateau that narrows to the middle.
    const { height } = highest;
    expect(middle(highest)).toBeGreaterThanOrEqual(Math.max(...height) - 1);
    for (let i = 0; i < SHEET_EDGE_SAMPLES; i++) {
      expect(height[i]).toBeCloseTo(height[SHEET_EDGE_SAMPLES - 1 - i], 2);
    }
  });

  it("dips, but never below the floor, when the card jumps up", () => {
    let current = restingSheetEdge();
    let deepest = 0;
    for (let time = 0; time < 0.1; time += FRAME) {
      current = stepSheetEdge(
        current,
        { ...STILL, cardVelocity: time < FRAME ? 0 : -3000 },
        FRAME,
      );
      deepest = Math.min(deepest, ...current.height);
    }
    expect(deepest).toBeLessThan(-2);
    expect(deepest).toBeGreaterThanOrEqual(-4);
  });

  it("settles in about a second and a half", () => {
    const { field } = run(
      restingSheetEdge(),
      (time) => ({ ...STILL, cardVelocity: time < FRAME ? -1500 : 0 }),
      1.5,
    );
    expect(sheetEdgeEnergy(field)).toBeLessThan(1);
  });

  it("rises to a peak under the finger, and the rest of the edge lags it", () => {
    const { field } = run(
      restingSheetEdge(),
      () => ({ ...STILL, finger: 0.25 }),
      0.08,
    );
    const at = (share: number) =>
      field.height[Math.round(share * (SHEET_EDGE_SAMPLES - 1))];
    expect(at(0.25)).toBeGreaterThan(5);
    expect(at(0.25)).toBeGreaterThan(at(0.5) * 1.5);
    expect(at(0.9)).toBeLessThan(at(0.25) / 4);
  });

  it("raises a higher, wider peak the further a drag holds the card past its top", () => {
    const held = (stretch: number) =>
      run(restingSheetEdge(), () => ({ ...STILL, finger: 0.5, stretch }), 0.4)
        .field;
    const plain = held(0);
    const stretched = held(60);
    expect(middle(stretched)).toBeGreaterThan(middle(plain) + 3);
    expect(middle(stretched)).toBeLessThanOrEqual(20);
    const quarter = Math.round(0.3 * (SHEET_EDGE_SAMPLES - 1));
    expect(stretched.height[quarter]).toBeGreaterThan(plain.height[quarter]);
  });

  it("carries the peak sideways with the finger", () => {
    const left = run(
      restingSheetEdge(),
      () => ({ ...STILL, finger: 0.3 }),
      0.3,
    ).field;
    const moved = run(left, () => ({ ...STILL, finger: 0.7 }), 0.3).field;
    const at = (field: SheetEdgeField, share: number) =>
      field.height[Math.round(share * (SHEET_EDGE_SAMPLES - 1))];
    expect(at(left, 0.3)).toBeGreaterThan(at(left, 0.7));
    expect(at(moved, 0.7)).toBeGreaterThan(at(moved, 0.3));
  });

  it("keeps a jump of the card to a splash no higher than a landing", () => {
    const landing = run(
      restingSheetEdge(),
      (time) => ({ ...STILL, cardVelocity: time < FRAME ? -1500 : 0 }),
      0.3,
    ).peaks;
    const jump = run(
      restingSheetEdge(),
      (time) => ({ ...STILL, cardVelocity: time < FRAME ? -30_000 : 0 }),
      0.3,
    ).peaks;
    expect(Math.max(...jump)).toBeLessThanOrEqual(Math.max(...landing) + 2);
  });
});

describe("finiteSheetEdge", () => {
  it("rests an edge with a sample that is not finite", () => {
    const broken = restingSheetEdge();
    broken.height[3] = Number.NaN;
    expect(finiteSheetEdge(broken)).toEqual(restingSheetEdge());
    const sound = stepSheetEdge(
      restingSheetEdge(),
      { ...STILL, finger: 0.5 },
      FRAME,
    );
    expect(finiteSheetEdge(sound)).toBe(sound);
  });
});
