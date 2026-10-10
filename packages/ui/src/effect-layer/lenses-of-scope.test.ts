import { describe, expect, it } from "vitest";
import { SCENE_LAYOUT } from "./black-hole-wgsl.ts";
import { roleBits } from "./effect-roles.ts";
import { lensesOfScope } from "./lenses-of-scope.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type { EffectElementRecord } from "./types.ts";

const BLACK_HOLE = roleBits(["blackHole"]);
const VIEWPORT = { x: 0, y: 0, width: 1280, height: 800 };

function record(
  id: number,
  overrides: Partial<EffectElementRecord> = {},
): EffectElementRecord {
  return {
    id,
    element: document.createElement("div"),
    roles: BLACK_HOLE,
    settings: {},
    x: 100 * id,
    y: 100,
    width: 80,
    height: 80,
    fixed: false,
    radii: [40, 40, 40, 40],
    cornerExponent: 2,
    fill: [0, 0, 0, 1],
    grayscale: 0,
    scope: PAGE_SCOPE,
    holds: null,
    scopeIndex: PAGE_SCOPE,
    ...overrides,
  };
}

const range = (firstElement: number, elementCount: number) => ({
  firstElement,
  elementCount,
});

describe("lensesOfScope", () => {
  it("takes the Black holes of the scope on both canvas elements, by their index in the elements", () => {
    const elements = [
      record(1),
      record(2, { roles: 0 }),
      record(3, { scopeIndex: 1 }),
      record(4, { fixed: true }),
    ];
    const lenses = lensesOfScope(
      elements,
      { scroll: range(0, 2), fixed: range(3, 1) },
      VIEWPORT,
    );
    expect(lenses.map(({ element }) => element).toSorted()).toEqual([0, 3]);
  });

  it(`keeps at most ${String(SCENE_LAYOUT.maxLenses)}`, () => {
    const elements = Array.from({ length: 12 }, (_, index) =>
      record(index + 1),
    );
    expect(
      lensesOfScope(
        elements,
        { scroll: range(0, 12), fixed: range(12, 0) },
        VIEWPORT,
      ),
    ).toHaveLength(SCENE_LAYOUT.maxLenses);
  });
});
