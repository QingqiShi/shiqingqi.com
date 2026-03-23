import { describe, expect, it } from "vitest";
import {
  createDiscoverMoviesTool,
  discoverMoviesInputSchema,
} from "./discover-movies";

describe("discoverMoviesInputSchema", () => {
  it("accepts empty input (all optional)", () => {
    const result = discoverMoviesInputSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts sort_by", () => {
    const result = discoverMoviesInputSchema.parse({
      sort_by: "vote_average.desc",
    });
    expect(result.sort_by).toBe("vote_average.desc");
  });

  it("rejects invalid sort_by value", () => {
    expect(() =>
      discoverMoviesInputSchema.parse({ sort_by: "invalid.desc" }),
    ).toThrow();
  });

  it("accepts genre filters", () => {
    const result = discoverMoviesInputSchema.parse({
      with_genres: "28,878",
      without_genres: "16",
    });
    expect(result.with_genres).toBe("28,878");
    expect(result.without_genres).toBe("16");
  });

  it("accepts year and date range filters", () => {
    const result = discoverMoviesInputSchema.parse({
      primary_release_year: 2024,
      "primary_release_date.gte": "2024-01-01",
      "primary_release_date.lte": "2024-12-31",
    });
    expect(result.primary_release_year).toBe(2024);
    expect(result["primary_release_date.gte"]).toBe("2024-01-01");
    expect(result["primary_release_date.lte"]).toBe("2024-12-31");
  });

  it("accepts vote average filters", () => {
    const result = discoverMoviesInputSchema.parse({
      "vote_average.gte": 7.5,
      "vote_average.lte": 9,
    });
    expect(result["vote_average.gte"]).toBe(7.5);
    expect(result["vote_average.lte"]).toBe(9);
  });

  it("accepts language filter", () => {
    const result = discoverMoviesInputSchema.parse({
      with_original_language: "ko",
    });
    expect(result.with_original_language).toBe("ko");
  });

  it("accepts runtime filters", () => {
    const result = discoverMoviesInputSchema.parse({
      "with_runtime.gte": 90,
      "with_runtime.lte": 180,
    });
    expect(result["with_runtime.gte"]).toBe(90);
    expect(result["with_runtime.lte"]).toBe(180);
  });

  it("accepts cast and crew filters", () => {
    const result = discoverMoviesInputSchema.parse({
      with_cast: "500,287",
      with_crew: "1223",
    });
    expect(result.with_cast).toBe("500,287");
    expect(result.with_crew).toBe("1223");
  });

  it("accepts full combined input", () => {
    const result = discoverMoviesInputSchema.parse({
      sort_by: "popularity.desc",
      with_genres: "27",
      primary_release_year: 2024,
      "vote_average.gte": 8,
      with_original_language: "en",
    });
    expect(result.sort_by).toBe("popularity.desc");
    expect(result.with_genres).toBe("27");
    expect(result.primary_release_year).toBe(2024);
    expect(result["vote_average.gte"]).toBe(8);
    expect(result.with_original_language).toBe("en");
  });

  it("rejects non-number for primary_release_year", () => {
    expect(() =>
      discoverMoviesInputSchema.parse({ primary_release_year: "2024" }),
    ).toThrow();
  });
});

describe("createDiscoverMoviesTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createDiscoverMoviesTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("movie");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createDiscoverMoviesTool("en");
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("creates separate tool instances per locale", () => {
    const enTool = createDiscoverMoviesTool("en");
    const zhTool = createDiscoverMoviesTool("zh");
    expect(enTool).not.toBe(zhTool);
  });
});
