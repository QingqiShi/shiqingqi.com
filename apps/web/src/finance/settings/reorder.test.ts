import { describe, expect, it } from "vitest";
import { moveBy, moveTo, reorder } from "./reorder.ts";

describe("moveTo", () => {
  it("puts the id where the target is, in either direction", () => {
    expect(moveTo(["a", "b", "c", "d"], "a", "c")).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(moveTo(["a", "b", "c", "d"], "d", "b")).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("leaves the order alone for an unknown id", () => {
    expect(moveTo(["a", "b"], "x", "a")).toEqual(["a", "b"]);
  });
});

describe("moveBy", () => {
  it("swaps with the neighbour and stops at either end", () => {
    expect(moveBy(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveBy(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveBy(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });
});

describe("reorder", () => {
  const rows = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  it("numbers the rows in the new order and leaves out unchanged ones", () => {
    expect(reorder(rows, ["b", "a", "c"])).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });

  it("numbers rows that share a position or have gaps", () => {
    const loose = [
      { id: "a", position: 0 },
      { id: "b", position: 0 },
      { id: "c", position: 7 },
    ];
    expect(reorder(loose, ["a", "b", "c"])).toEqual([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("keeps the rows outside the order in their slots", () => {
    const withHidden = [
      { id: "a", position: 0 },
      { id: "hidden", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ];
    expect(reorder(withHidden, ["c", "a", "b"])).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 2 },
      { id: "b", position: 3 },
    ]);
  });

  it("moves a Group past Groups of the other side", () => {
    const groups = [
      { id: "cash", position: 0, side: "asset" },
      { id: "investments", position: 1, side: "asset" },
      { id: "cards", position: 2, side: "liability" },
    ];
    const assets = ["cash", "investments"];
    expect(
      reorder(
        groups,
        moveTo(["cash", "investments", "cards"], "cards", "investments"),
      ),
    ).toEqual([
      { id: "cards", position: 1 },
      { id: "investments", position: 2 },
    ]);
    expect(reorder(groups, moveBy(assets, "investments", -1))).toEqual([
      { id: "investments", position: 0 },
      { id: "cash", position: 1 },
    ]);
  });
});
