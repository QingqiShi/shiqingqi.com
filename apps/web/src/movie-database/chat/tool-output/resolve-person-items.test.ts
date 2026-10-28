import { describe, expect, it } from "vitest";
import type { PersonListItem } from "#src/movie-database/types.ts";
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

  it("handles mixed found and missing items", () => {
    const input = {
      people: [{ id: 1 }, { id: 999 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Brad Pitt");
    expect(items[1]).toEqual({ id: 999 });
  });

  it("rejects entire input when any entry has invalid schema", () => {
    expect(
      resolvePersonItems({ people: [{ id: "abc" }] }, personResults),
    ).toEqual([]);
  });
});
