import { describe, expect, test } from "vitest";
import {
  selectionAfterKey,
  selectionFromTouches,
} from "./use-chart-selection.ts";

describe("selectionAfterKey", () => {
  test("starts at the last point and moves one point at a time", () => {
    expect(selectionAfterKey(null, "ArrowLeft", false, 5)).toEqual({
      kind: "point",
      index: 3,
    });
    expect(
      selectionAfterKey({ kind: "point", index: 0 }, "ArrowLeft", false, 5),
    ).toEqual({ kind: "point", index: 0 });
    expect(selectionAfterKey(null, "Home", false, 5)).toEqual({
      kind: "point",
      index: 0,
    });
  });

  test("anchors a range at the current point on the first Shift press", () => {
    const first = selectionAfterKey(
      { kind: "point", index: 2 },
      "ArrowRight",
      true,
      5,
    );
    expect(first).toEqual({ kind: "range", anchor: 2, index: 3 });
    expect(selectionAfterKey(first ?? null, "End", true, 5)).toEqual({
      kind: "range",
      anchor: 2,
      index: 4,
    });
    expect(selectionAfterKey(first ?? null, "Home", true, 5)).toEqual({
      kind: "range",
      anchor: 2,
      index: 0,
    });
  });

  test("anchors at the last point when nothing is picked", () => {
    expect(selectionAfterKey(null, "ArrowLeft", true, 5)).toEqual({
      kind: "range",
      anchor: 4,
      index: 3,
    });
  });

  test("returns to a point on an arrow without Shift", () => {
    expect(
      selectionAfterKey(
        { kind: "range", anchor: 1, index: 3 },
        "ArrowRight",
        false,
        5,
      ),
    ).toEqual({ kind: "point", index: 4 });
  });

  test("clears on Escape and ignores other keys", () => {
    expect(
      selectionAfterKey(
        { kind: "range", anchor: 1, index: 3 },
        "Escape",
        false,
        5,
      ),
    ).toBeNull();
    expect(selectionAfterKey(null, "Escape", false, 5)).toBeUndefined();
    expect(selectionAfterKey(null, "a", false, 5)).toBeUndefined();
    expect(selectionAfterKey(null, "ArrowLeft", false, 0)).toBeUndefined();
  });
});

describe("selectionFromTouches", () => {
  test("reads a point with one finger and a range with two", () => {
    expect(selectionFromTouches([])).toBeNull();
    expect(selectionFromTouches([4])).toEqual({ kind: "point", index: 4 });
    expect(selectionFromTouches([8, 3])).toEqual({
      kind: "range",
      anchor: 8,
      index: 3,
    });
  });
});
