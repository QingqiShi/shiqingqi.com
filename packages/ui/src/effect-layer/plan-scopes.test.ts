import { describe, expect, it } from "vitest";
import type { EffectColor } from "./parse-css-color.ts";
import {
  PAGE_SCOPE,
  peersOf,
  planCanvasNeeds,
  planScopes,
} from "./plan-scopes.ts";
import type { EffectElementRecord, MeasuredElement } from "./types.ts";

function record(
  id: number,
  overrides: Partial<MeasuredElement> = {},
): MeasuredElement {
  return {
    id,
    element: document.createElement("div"),
    measurement: 0,
    roles: 0,
    settings: {},
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    carrier: "page",
    radii: [0, 0, 0, 0],
    cornerExponent: 2,
    fill: [0, 0, 0, 0],
    grayscale: 0,
    scope: PAGE_SCOPE,
    holds: null,
    ...overrides,
    carriers: overrides.carriers ?? [overrides.carrier ?? "page"],
  };
}

const PAGE: EffectColor = [0.98, 0.98, 0.98, 1];

const ids = (records: readonly EffectElementRecord[]) =>
  records.map((item) => item.id);

describe("planScopes", () => {
  it("puts the elements in the document before the fixed ones, each group by scope, and points each scope at its container", () => {
    const plan = planScopes(
      [
        record(1),
        record(2, { scope: 40, roles: 1 }),
        record(5, { holds: 40 }),
        record(3, { carrier: "fixed", scope: 40 }),
        record(4, { carrier: "fixed" }),
      ],
      PAGE,
    );
    expect(ids(plan.elements)).toEqual([1, 5, 2, 4, 3]);
    expect(plan.elements.map(({ scopeIndex }) => scopeIndex)).toEqual([
      0, 0, 1, 0, 1,
    ]);
    expect(plan.carriers).toEqual(["page", "fixed", "fixedBottom"]);
    expect(plan.ranges[0]).toEqual({
      firstElement: 0,
      elementCount: 3,
      hasRole: true,
    });
    expect(plan.ranges[1]).toEqual({
      firstElement: 3,
      elementCount: 2,
      hasRole: false,
    });
    expect(
      plan.scopes.map(({ id, container, ranges }) => ({
        id,
        container,
        ranges,
      })),
    ).toEqual([
      {
        id: PAGE_SCOPE,
        container: -1,
        ranges: [
          { firstElement: 0, elementCount: 2 },
          { firstElement: 3, elementCount: 1 },
          { firstElement: 0, elementCount: 0 },
        ],
      },
      {
        id: 40,
        container: 1,
        ranges: [
          { firstElement: 2, elementCount: 1 },
          { firstElement: 4, elementCount: 1 },
          { firstElement: 0, elementCount: 0 },
        ],
      },
    ]);
    expect(peersOf(plan.scopes, plan.elements[4])).toEqual({
      firstElement: 4,
      elementCount: 1,
    });
  });

  it("puts the elements fixed to the bottom after the fixed ones, on the bottom canvas, each scope one range", () => {
    const plan = planScopes(
      [
        record(1, { carrier: "fixedBottom", scope: 40, roles: 1 }),
        record(2, { carrier: "fixedBottom", holds: 40 }),
        record(3, { carrier: "fixed" }),
        record(4),
      ],
      PAGE,
    );
    expect(ids(plan.elements)).toEqual([4, 3, 2, 1]);
    expect(plan.ranges[1]).toEqual({
      firstElement: 1,
      elementCount: 1,
      hasRole: false,
    });
    expect(plan.ranges[2]).toEqual({
      firstElement: 2,
      elementCount: 2,
      hasRole: true,
    });
    expect(plan.scopes.map(({ ranges }) => ranges[2])).toEqual([
      { firstElement: 2, elementCount: 1 },
      { firstElement: 3, elementCount: 1 },
    ]);
    expect(plan.scopes[1].container).toBe(2);
    expect(peersOf(plan.scopes, plan.elements[3])).toEqual({
      firstElement: 3,
      elementCount: 1,
    });
  });

  it("does not need the bottom canvas for an element on a sticky carrier", () => {
    const plan = planScopes(
      [
        record(1, {
          roles: 1,
          carrier: "fixed",
          carriers: ["page", "fixed"],
        }),
      ],
      PAGE,
    );
    expect(plan.ranges[2].hasRole).toBe(false);
  });

  it("points a nested container's scope at the container around it", () => {
    const plan = planScopes(
      [
        record(1, { scope: 41 }),
        record(2, { holds: 41, scope: 40 }),
        record(3, { holds: 40 }),
      ],
      PAGE,
    );
    const container = plan.scopes.find(({ id }) => id === 41)?.container ?? -1;
    expect(plan.elements[container].id).toBe(2);
    expect(plan.scopes[plan.elements[container].scopeIndex].id).toBe(40);
  });

  it("leaves out the elements of a container with no box, and of the containers inside it", () => {
    const plan = planScopes(
      [
        record(1, { scope: 40, roles: 1 }),
        record(2, { holds: 41, scope: 40 }),
        record(3, { scope: 41 }),
        record(4),
      ],
      PAGE,
    );
    expect(ids(plan.elements)).toEqual([4]);
    expect(plan.ranges[0].hasRole).toBe(false);
    expect(plan.scopes.map(({ id }) => id)).toEqual([PAGE_SCOPE]);
  });

  it("needs both canvases for an element with a role on a sticky carrier, stuck or not", () => {
    for (const carrier of ["page", "fixed"] as const) {
      const plan = planScopes(
        [
          record(1, { roles: 1, carrier, carriers: ["page", "fixed"] }),
          record(2),
        ],
        PAGE,
      );
      expect(plan.ranges[0].hasRole).toBe(true);
      expect(plan.ranges[1].hasRole).toBe(true);
    }
  });

  it("gives each Scroll region a carrier after the viewport's, by id, with a range in each scope", () => {
    const plan = planScopes(
      [
        record(1, { carrier: 9, roles: 1 }),
        record(2, { carrier: 4, scope: 40 }),
        record(3, { holds: 40 }),
        record(4, { carrier: "fixed", carriers: [4, "fixed"], roles: 1 }),
        record(5, { carrier: 4 }),
      ],
      PAGE,
    );
    expect(plan.carriers).toEqual(["page", "fixed", "fixedBottom", 4, 9]);
    expect(ids(plan.elements)).toEqual([3, 4, 5, 2, 1]);
    expect(plan.elements.map(({ carrierIndex }) => carrierIndex)).toEqual([
      0, 1, 3, 3, 4,
    ]);
    expect(plan.ranges.map(({ hasRole }) => hasRole)).toEqual([
      false,
      true,
      false,
      true,
      true,
    ]);
    expect(plan.scopes.map(({ ranges }) => ranges.slice(3))).toEqual([
      [
        { firstElement: 2, elementCount: 1 },
        { firstElement: 4, elementCount: 1 },
      ],
      [
        { firstElement: 3, elementCount: 1 },
        { firstElement: 0, elementCount: 0 },
      ],
    ]);
    expect(peersOf(plan.scopes, plan.elements[3])).toEqual({
      firstElement: 3,
      elementCount: 1,
    });
  });

  it("leaves out a loop of containers", () => {
    const plan = planScopes(
      [
        record(1, { holds: 40, scope: 41 }),
        record(2, { holds: 41, scope: 40 }),
      ],
      PAGE,
    );
    expect(plan.elements).toEqual([]);
  });

  it("takes the backdrop from the nearest container fill that is at least half opaque, or else the page", () => {
    const plan = planScopes(
      [
        record(1, { holds: 11, fill: [0.1, 0.1, 0.1, 1] }),
        record(2, { holds: 12, scope: 11, fill: [1, 1, 1, 0.2] }),
        record(3, { holds: 13, fill: [1, 1, 1, 0] }),
        record(4, { holds: 14, scope: 11, fill: [1, 0, 0, 0.5] }),
      ],
      PAGE,
    );
    const scope = (id: number) => plan.scopes.find((item) => item.id === id);
    expect(scope(PAGE_SCOPE)).toMatchObject({ backdrop: PAGE, dark: false });
    expect(scope(11)).toMatchObject({
      backdrop: [0.1, 0.1, 0.1, 1],
      dark: true,
    });
    expect(scope(12)?.backdrop).toEqual([0.1, 0.1, 0.1, 1]);
    expect(scope(13)?.backdrop).toEqual(PAGE);
    expect(scope(14)?.backdrop).toEqual([1, 0, 0, 0.5]);
  });
});

describe("planCanvasNeeds", () => {
  const scroller = document.createElement("div");
  const content = document.createElement("div");
  const sheet = document.createElement("div");
  const inSheet = document.createElement("div");
  const sheetContent = document.createElement("div");
  sheet.append(inSheet);
  const regions = new Map([
    [4, { id: 4, scroller, content, parent: { kind: "page" } as const }],
    [
      9,
      {
        id: 9,
        scroller: inSheet,
        content: sheetContent,
        parent: { kind: "viewport", edge: "top" } as const,
      },
    ],
  ]);
  const region = (id: number) => regions.get(id);
  const plan = planScopes(
    [
      record(1, { roles: 1 }),
      record(2, { carrier: "fixed", roles: 1 }),
      record(3, { carrier: 4, roles: 1 }),
      record(4, { carrier: 9, roles: 1 }),
      record(5, { carrier: "fixedBottom" }),
    ],
    PAGE,
  );

  it("needs the canvases of each carrier with a role", () => {
    expect(planCanvasNeeds(plan, [], region)).toEqual([
      { key: "page", content: null },
      { key: "fixed", content: null },
      { key: 4, content },
      { key: 9, content: sheetContent },
    ]);
  });

  it("releases the page and each region outside a modal cover while the cover shows", () => {
    expect(planCanvasNeeds(plan, [sheet], region)).toEqual([
      { key: "fixed", content: null },
      { key: 9, content: sheetContent },
    ]);
  });

  it("needs no canvases for a region with no scroller or content box", () => {
    expect(planCanvasNeeds(plan, [], () => undefined)).toEqual([
      { key: "page", content: null },
      { key: "fixed", content: null },
    ]);
  });
});
