import { describe, expect, it } from "vitest";
import {
  createDiscoverTvShowsTool,
  discoverTvShowsInputSchema,
} from "./discover-tv-shows";

describe("discoverTvShowsInputSchema", () => {
  it("accepts empty input (all optional)", () => {
    const result = discoverTvShowsInputSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts sort_by", () => {
    const result = discoverTvShowsInputSchema.parse({
      sort_by: "vote_average.desc",
    });
    expect(result.sort_by).toBe("vote_average.desc");
  });

  it("rejects invalid sort_by value", () => {
    expect(() =>
      discoverTvShowsInputSchema.parse({ sort_by: "revenue.desc" }),
    ).toThrow();
  });

  it("accepts genre filters", () => {
    const result = discoverTvShowsInputSchema.parse({
      with_genres: "18,80",
      without_genres: "10764",
    });
    expect(result.with_genres).toBe("18,80");
    expect(result.without_genres).toBe("10764");
  });

  it("accepts year and date range filters", () => {
    const result = discoverTvShowsInputSchema.parse({
      first_air_date_year: 2023,
      "first_air_date.gte": "2023-01-01",
      "first_air_date.lte": "2023-12-31",
    });
    expect(result.first_air_date_year).toBe(2023);
    expect(result["first_air_date.gte"]).toBe("2023-01-01");
    expect(result["first_air_date.lte"]).toBe("2023-12-31");
  });

  it("accepts vote average filters", () => {
    const result = discoverTvShowsInputSchema.parse({
      "vote_average.gte": 8,
      "vote_average.lte": 10,
    });
    expect(result["vote_average.gte"]).toBe(8);
    expect(result["vote_average.lte"]).toBe(10);
  });

  it("accepts language filter", () => {
    const result = discoverTvShowsInputSchema.parse({
      with_original_language: "ja",
    });
    expect(result.with_original_language).toBe("ja");
  });

  it("accepts runtime filters", () => {
    const result = discoverTvShowsInputSchema.parse({
      "with_runtime.gte": 20,
      "with_runtime.lte": 60,
    });
    expect(result["with_runtime.gte"]).toBe(20);
    expect(result["with_runtime.lte"]).toBe(60);
  });

  it("accepts network filter", () => {
    const result = discoverTvShowsInputSchema.parse({
      with_networks: 213,
    });
    expect(result.with_networks).toBe(213);
  });

  it("accepts status and type filters", () => {
    const result = discoverTvShowsInputSchema.parse({
      with_status: "0",
      with_type: "4",
    });
    expect(result.with_status).toBe("0");
    expect(result.with_type).toBe("4");
  });

  it("accepts full combined input", () => {
    const result = discoverTvShowsInputSchema.parse({
      sort_by: "popularity.desc",
      with_genres: "18",
      first_air_date_year: 2023,
      "vote_average.gte": 8,
      with_original_language: "ko",
      with_networks: 213,
    });
    expect(result.sort_by).toBe("popularity.desc");
    expect(result.with_genres).toBe("18");
    expect(result.first_air_date_year).toBe(2023);
    expect(result["vote_average.gte"]).toBe(8);
    expect(result.with_original_language).toBe("ko");
    expect(result.with_networks).toBe(213);
  });

  it("rejects non-number for first_air_date_year", () => {
    expect(() =>
      discoverTvShowsInputSchema.parse({ first_air_date_year: "2023" }),
    ).toThrow();
  });

  it("rejects non-number for with_networks", () => {
    expect(() =>
      discoverTvShowsInputSchema.parse({ with_networks: "netflix" }),
    ).toThrow();
  });
});

describe("createDiscoverTvShowsTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createDiscoverTvShowsTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("TV");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createDiscoverTvShowsTool("en");
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("creates separate tool instances per locale", () => {
    const enTool = createDiscoverTvShowsTool("en");
    const zhTool = createDiscoverTvShowsTool("zh");
    expect(enTool).not.toBe(zhTool);
  });
});
