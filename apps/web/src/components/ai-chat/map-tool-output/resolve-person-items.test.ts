import { describe, expect, it } from "vitest";
import type { PersonListItem } from "#src/utils/person-list-item.ts";
import { resolvePersonItems } from "./resolve-person-items";

describe("resolvePersonItems", () => {
  const personResults = new Map<number, PersonListItem>([
    [
      1,
      {
        id: 1,
        name: "Brad Pitt",
        profilePath: "/brad.jpg",
        knownForDepartment: "Acting",
      },
    ],
    [
      2,
      {
        id: 2,
        name: "David Fincher",
        profilePath: "/fincher.jpg",
        knownForDepartment: "Directing",
      },
    ],
  ]);

  it("resolves items in specified order", () => {
    const input = {
      people: [{ id: 2 }, { id: 1 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("David Fincher");
    expect(items[1]?.name).toBe("Brad Pitt");
  });

  it("creates fallback for missing IDs", () => {
    const input = { people: [{ id: 999 }] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([{ id: 999 }]);
  });

  it("handles mixed found and missing items", () => {
    const input = {
      people: [{ id: 1 }, { id: 999 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Brad Pitt");
    expect(items[1]).toEqual({ id: 999 });
  });

  it("returns empty for invalid input", () => {
    expect(resolvePersonItems(null, personResults)).toEqual([]);
    expect(resolvePersonItems("string", personResults)).toEqual([]);
    expect(resolvePersonItems({}, personResults)).toEqual([]);
    expect(resolvePersonItems({ people: "not-array" }, personResults)).toEqual(
      [],
    );
  });

  it("rejects entire input when any entry has invalid schema", () => {
    expect(
      resolvePersonItems({ people: [{ id: "abc" }] }, personResults),
    ).toEqual([]);
  });

  it("returns empty array for empty people list", () => {
    const input = { people: [] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([]);
  });
});
