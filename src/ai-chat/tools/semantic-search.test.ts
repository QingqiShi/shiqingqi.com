import { describe, expect, it } from "vitest";
import {
  createSemanticSearchTool,
  semanticSearchInputSchema,
} from "./semantic-search";

describe("semanticSearchInputSchema", () => {
  it("accepts a valid query-only input", () => {
    const result = semanticSearchInputSchema.parse({
      query: "mind-bending sci-fi with time loops",
    });
    expect(result.query).toBe("mind-bending sci-fi with time loops");
    expect(result.filters).toBeUndefined();
    expect(result.topK).toBeUndefined();
  });

  it("accepts full input with filters and topK", () => {
    const result = semanticSearchInputSchema.parse({
      query: "dark crime thriller",
      filters: {
        mediaType: "movie",
        genreIds: [80, 53],
        releaseYearMin: 1990,
        releaseYearMax: 2005,
        voteAverageMin: 7.0,
        originalLanguage: "en",
      },
      topK: 5,
    });
    expect(result.query).toBe("dark crime thriller");
    expect(result.filters?.mediaType).toBe("movie");
    expect(result.filters?.genreIds).toEqual([80, 53]);
    expect(result.topK).toBe(5);
  });

  it("rejects missing query", () => {
    expect(() => semanticSearchInputSchema.parse({})).toThrow();
  });

  it("accepts empty string query", () => {
    expect(() => semanticSearchInputSchema.parse({ query: "" })).not.toThrow();
  });

  it("rejects non-string query", () => {
    expect(() => semanticSearchInputSchema.parse({ query: 42 })).toThrow();
  });

  it("rejects topK below 1", () => {
    expect(() =>
      semanticSearchInputSchema.parse({ query: "test", topK: 0 }),
    ).toThrow();
  });

  it("rejects topK above 50", () => {
    expect(() =>
      semanticSearchInputSchema.parse({ query: "test", topK: 51 }),
    ).toThrow();
  });

  it("rejects non-integer topK", () => {
    expect(() =>
      semanticSearchInputSchema.parse({ query: "test", topK: 5.5 }),
    ).toThrow();
  });

  it("accepts topK at boundaries", () => {
    expect(
      semanticSearchInputSchema.parse({ query: "test", topK: 1 }).topK,
    ).toBe(1);
    expect(
      semanticSearchInputSchema.parse({ query: "test", topK: 50 }).topK,
    ).toBe(50);
  });

  it("rejects invalid mediaType in filters", () => {
    expect(() =>
      semanticSearchInputSchema.parse({
        query: "test",
        filters: { mediaType: "anime" },
      }),
    ).toThrow();
  });

  it("accepts tv mediaType in filters", () => {
    const result = semanticSearchInputSchema.parse({
      query: "test",
      filters: { mediaType: "tv" },
    });
    expect(result.filters?.mediaType).toBe("tv");
  });
});

describe("createSemanticSearchTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createSemanticSearchTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("semantic");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createSemanticSearchTool("en");
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("creates separate tool instances per locale", () => {
    const enTool = createSemanticSearchTool("en");
    const zhTool = createSemanticSearchTool("zh");
    expect(enTool).not.toBe(zhTool);
  });
});
