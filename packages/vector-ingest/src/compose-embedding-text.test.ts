import { describe, it, expect } from "vitest";
import { extractDirectors } from "./compose-embedding-text.ts";
import { makeTvDetail } from "./test-fixtures.ts";

describe("extractDirectors", () => {
  it("falls back to Executive Producer for TV", () => {
    const directors = extractDirectors(makeTvDetail().credits.crew ?? [], "tv");
    expect(directors.names).toEqual(["Vince Gilligan"]);
    expect(directors.ids).toEqual([66633]);
  });

  it("prefers Series Director for TV when available", () => {
    const crew = [
      {
        adult: false,
        gender: 2,
        id: 1,
        name: "Series Dir",
        job: "Series Director",
        department: "Directing",
        popularity: 1,
      },
      {
        adult: false,
        gender: 2,
        id: 2,
        name: "Exec Prod",
        job: "Executive Producer",
        department: "Production",
        popularity: 1,
      },
    ];
    const directors = extractDirectors(crew, "tv");
    expect(directors.names).toEqual(["Series Dir"]);
    expect(directors.ids).toEqual([1]);
  });
});
