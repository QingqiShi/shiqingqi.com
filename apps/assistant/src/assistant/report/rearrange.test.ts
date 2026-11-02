import { describe, expect, it } from "vitest";
import { rearrange, spanOfMove } from "./rearrange.ts";

const items = (...ids: string[]) => ids.map((id) => ({ id }));
const idsOf = (list: readonly { id: string }[]) => list.map(({ id }) => id);

describe("rearrange", () => {
  it("puts the listed items in the places they hold, and leaves the others", () => {
    expect(
      idsOf(rearrange(items("a", "x", "b", "y", "c"), ["c", "a", "b"])),
    ).toEqual(["c", "x", "a", "y", "b"]);
  });

  it("ignores an id that has no item", () => {
    expect(idsOf(rearrange(items("a", "b", "c"), ["c", "gone", "a"]))).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});

describe("spanOfMove", () => {
  it("gives the ids between the two places, in their new order", () => {
    const ids = ["a", "b", "c", "d", "e"];

    expect(spanOfMove(ids, 1, 3)).toEqual(["c", "d", "b"]);
    expect(spanOfMove(ids, 3, 1)).toEqual(["d", "b", "c"]);
  });
});
