import { describe, expect, it } from "vitest";
import type { EffectColor } from "./parse-css-color.ts";
import { PAGE_SCOPE, peersOf, planScopes } from "./plan-scopes.ts";
import type { EffectElementRecord, MeasuredElement } from "./types.ts";

function record(
  id: number,
  overrides: Partial<MeasuredElement> = {},
): MeasuredElement {
  return {
    id,
    element: document.createElement("div"),
    roles: 0,
    settings: {},
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    fixed: false,
    radii: [0, 0, 0, 0],
    cornerExponent: 2,
    fill: [0, 0, 0, 0],
    grayscale: 0,
    scope: PAGE_SCOPE,
    holds: null,
    ...overrides,
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
        record(3, { fixed: true, scope: 40 }),
        record(4, { fixed: true }),
      ],
      PAGE,
    );
    expect(ids(plan.elements)).toEqual([1, 5, 2, 4, 3]);
    expect(plan.elements.map(({ scopeIndex }) => scopeIndex)).toEqual([
      0, 0, 1, 0, 1,
    ]);
    expect(plan.document).toEqual({
      firstElement: 0,
      elementCount: 3,
      hasRole: true,
    });
    expect(plan.fixed).toEqual({
      firstElement: 3,
      elementCount: 2,
      hasRole: false,
    });
    expect(
      plan.scopes.map(({ id, container, scroll, fixed }) => ({
        id,
        container,
        scroll,
        fixed,
      })),
    ).toEqual([
      {
        id: PAGE_SCOPE,
        container: -1,
        scroll: { firstElement: 0, elementCount: 2 },
        fixed: { firstElement: 3, elementCount: 1 },
      },
      {
        id: 40,
        container: 1,
        scroll: { firstElement: 2, elementCount: 1 },
        fixed: { firstElement: 4, elementCount: 1 },
      },
    ]);
    expect(peersOf(plan.scopes, plan.elements[4])).toEqual({
      firstElement: 4,
      elementCount: 1,
    });
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
    expect(plan.document.hasRole).toBe(false);
    expect(plan.scopes.map(({ id }) => id)).toEqual([PAGE_SCOPE]);
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
