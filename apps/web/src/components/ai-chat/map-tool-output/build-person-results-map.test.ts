import { describe, expect, it } from "vitest";
import { buildPersonResultsMap } from "./build-person-results-map";

describe("buildPersonResultsMap for media_credits", () => {
  it("extracts persons from { cast, crew } object format", () => {
    const output = {
      cast: [
        {
          id: 1,
          name: "Brad Pitt",
          profile_path: "/brad.jpg",
          known_for_department: "Acting",
          character: "Tyler Durden",
          order: 0,
        },
      ],
      crew: [
        {
          id: 2,
          name: "David Fincher",
          profile_path: "/fincher.jpg",
          known_for_department: "Directing",
          department: "Directing",
          job: "Director",
        },
      ],
    };

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(2);
    expect(map.get(1)?.name).toBe("Brad Pitt");
    expect(map.get(2)?.name).toBe("David Fincher");
  });

  it("deduplicates persons who appear in both cast and crew", () => {
    const output = {
      cast: [
        {
          id: 1,
          name: "Clint Eastwood",
          profile_path: "/clint.jpg",
          known_for_department: "Acting",
          character: "Walt Kowalski",
          order: 0,
        },
      ],
      crew: [
        {
          id: 1,
          name: "Clint Eastwood",
          profile_path: "/clint.jpg",
          known_for_department: "Directing",
          department: "Directing",
          job: "Director",
        },
      ],
    };

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(1);
    expect(map.get(1)?.name).toBe("Clint Eastwood");
  });

  it("handles legacy flat array format for backwards compatibility", () => {
    const output = [
      {
        id: 1,
        name: "Brad Pitt",
        profile_path: "/brad.jpg",
        known_for_department: "Acting",
      },
    ];

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(1);
    expect(map.get(1)?.name).toBe("Brad Pitt");
  });

  it("returns empty map for non-object/non-array input", () => {
    expect(buildPersonResultsMap("media_credits", null).size).toBe(0);
    expect(buildPersonResultsMap("media_credits", "string").size).toBe(0);
    expect(buildPersonResultsMap("media_credits", 42).size).toBe(0);
  });

  it("handles empty cast and crew arrays", () => {
    const output = { cast: [], crew: [] };
    const map = buildPersonResultsMap("media_credits", output);
    expect(map.size).toBe(0);
  });
});
