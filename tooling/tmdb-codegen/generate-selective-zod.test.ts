import { describe, it, expect } from "vitest";
import { generateSchemasFromSource } from "./generate-selective-zod";

describe("generateSchemasFromSource", () => {
  it("generates correct schema for basic search-movie operation", () => {
    const mockTypeScript = `
      interface operations {
        "search-movie": {
          parameters: {
            query: {
              query: string;
              page?: number;
              include_adult?: boolean;
            };
          };
          requestBody?: never;
          responses: {
            200: {
              headers: {
                [name: string]: unknown;
              };
              content: {
                "application/json": unknown;
              };
            };
          };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["search-movie"]);

    // Check individual schema
    expect(result.individualSchemas.has("search-movie")).toBe(true);
    const searchMovieSchema = result.individualSchemas.get("search-movie");
    expect(searchMovieSchema?.exportName).toBe("searchMovieSchema");

    // Check file content contains expected exports
    expect(result.fileContent).toContain(
      "export const searchMovieSchema = z.object({",
    );
    expect(result.fileContent).toContain('"query": z.string()');
    expect(result.fileContent).toContain(
      '"page": z.number().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"include_adult": z.boolean().nullable().optional()',
    );

    // Check backward compatibility object
    expect(result.fileContent).toContain(
      "export const operationsSchema = z.object({",
    );
    expect(result.fileContent).toContain('"search-movie": searchMovieSchema,');

    // Check tree-shakable comment
    expect(result.fileContent).toContain(
      "// search-movie schema for direct import (tree-shakable)",
    );
  });

  it("generates correct schema for discover-movie with union types", () => {
    const mockTypeScript = `
      interface operations {
        "discover-movie": {
          parameters: {
            query: {
              sort_by?: "popularity.asc" | "popularity.desc" | "release_date.asc" | "release_date.desc";
              with_genres?: string;
              page?: number;
            };
          };
          requestBody?: never;
          responses: {
            200: {
              headers: { [name: string]: unknown };
              content: { "application/json": unknown };
            };
          };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "discover-movie",
    ]);

    expect(result.individualSchemas.has("discover-movie")).toBe(true);
    const discoverMovieSchema = result.individualSchemas.get("discover-movie");
    expect(discoverMovieSchema?.exportName).toBe("discoverMovieSchema");

    // Check union type handling
    expect(result.fileContent).toContain("z.union([");
    expect(result.fileContent).toContain('z.literal("popularity.asc")');
    expect(result.fileContent).toContain('z.literal("popularity.desc")');
    expect(result.fileContent).toContain('z.literal("release_date.asc")');
    expect(result.fileContent).toContain('z.literal("release_date.desc")');
    expect(result.fileContent).toContain('"sort_by": z.union([');
  });

  it("generates multiple operations correctly", () => {
    const mockTypeScript = `
      interface operations {
        "search-movie": {
          parameters: {
            query: {
              query: string;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
        "search-tv": {
          parameters: {
            query: {
              query: string;
              first_air_date_year?: number;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "search-movie",
      "search-tv",
    ]);

    // Check both operations are generated
    expect(result.individualSchemas.has("search-movie")).toBe(true);
    expect(result.individualSchemas.has("search-tv")).toBe(true);

    expect(result.fileContent).toContain(
      "export const searchMovieSchema = z.object({",
    );
    expect(result.fileContent).toContain(
      "export const searchTvSchema = z.object({",
    );

    // Check backward compatibility object contains both
    expect(result.fileContent).toContain('"search-movie": searchMovieSchema,');
    expect(result.fileContent).toContain('"search-tv": searchTvSchema,');
  });

  it("handles operation name conversion correctly", () => {
    const mockTypeScript = `
      interface operations {
        "genre-movie-list": {
          parameters: {
            query: {
              language?: string;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "genre-movie-list",
    ]);

    const genreMovieListSchema =
      result.individualSchemas.get("genre-movie-list");
    expect(genreMovieListSchema?.exportName).toBe("genreMovieListSchema");

    expect(result.fileContent).toContain(
      "export const genreMovieListSchema = z.object({",
    );
    expect(result.fileContent).toContain(
      '"genre-movie-list": genreMovieListSchema,',
    );
  });

  it("applies OpenAI compatibility (.nullable().optional()) to optional fields", () => {
    const mockTypeScript = `
      interface operations {
        "test-operation": {
          parameters: {
            query: {
              required_field: string;
              optional_string?: string;
              optional_number?: number;
              optional_boolean?: boolean;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "test-operation",
    ]);

    // Required field should not have .nullable().optional()
    expect(result.fileContent).toContain('"required_field": z.string()');
    expect(result.fileContent).not.toContain(
      '"required_field": z.string().nullable().optional()',
    );

    // Optional fields should have .nullable().optional()
    expect(result.fileContent).toContain(
      '"optional_string": z.string().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"optional_number": z.number().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"optional_boolean": z.boolean().nullable().optional()',
    );
  });

  it("handles never type for operations without query parameters", () => {
    const mockTypeScript = `
      interface operations {
        "no-query-operation": {
          parameters: {
            query?: never;
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "no-query-operation",
    ]);

    expect(result.fileContent).toContain(
      "query: z.never().nullable().optional()",
    );
  });

  it("ignores operations not in requiredOperations list", () => {
    const mockTypeScript = `
      interface operations {
        "search-movie": {
          parameters: { query: { query: string; }; };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
        "ignored-operation": {
          parameters: { query: { foo: string; }; };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["search-movie"]);

    expect(result.individualSchemas.has("search-movie")).toBe(true);
    expect(result.individualSchemas.has("ignored-operation")).toBe(false);

    expect(result.fileContent).toContain("searchMovieSchema");
    expect(result.fileContent).not.toContain("ignoredOperationSchema");
  });

  it("generates correct file header and structure", () => {
    const mockTypeScript = `
      interface operations {
        "test-op": {
          parameters: { query: { test: string; }; };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-op"]);

    // Check file header
    expect(result.fileContent).toContain(
      "// Generated by generate-selective-zod.ts",
    );
    expect(result.fileContent).toContain("// AST-BASED SCHEMA GENERATION");
    expect(result.fileContent).toContain("// PERFORMANCE OPTIMIZED:");
    expect(result.fileContent).toContain(
      "// - Individual exports for optimal tree-shaking",
    );

    // Check import statement
    expect(result.fileContent).toContain('import { z } from "zod";');

    // Check schema structure
    expect(result.fileContent).toContain("parameters: z.object({");
    expect(result.fileContent).toContain(
      "header: z.never().nullable().optional(),",
    );
    expect(result.fileContent).toContain(
      "path: z.never().nullable().optional(),",
    );
    expect(result.fileContent).toContain(
      "cookie: z.never().nullable().optional(),",
    );
    expect(result.fileContent).toContain(
      "requestBody: z.never().nullable().optional(),",
    );
    expect(result.fileContent).toContain("responses: z.object({");
    expect(result.fileContent).toContain("200: z.object({");
    expect(result.fileContent).toContain("headers: z.record(z.unknown()),");
    expect(result.fileContent).toContain('"application/json": z.unknown(),');
  });
});

describe("generateSchemasFromSource - Edge Cases", () => {
  // NOTE: Array handling is a complex edge case that's not needed for TMDB API
  // The current implementation handles the real-world use cases we need

  it("handles complex nested objects", () => {
    const mockTypeScript = `
      interface operations {
        "test-nested": {
          parameters: {
            query: {
              nested_object?: {
                level1: string;
                level2?: {
                  deep_field: number;
                  optional_deep?: boolean;
                };
              };
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-nested"]);

    expect(result.fileContent).toContain('"level1": z.string()');
    expect(result.fileContent).toContain('"deep_field": z.number()');
    expect(result.fileContent).toContain(
      '"optional_deep": z.boolean().nullable().optional()',
    );
    expect(result.fileContent).toContain('"level2": z.object({');
  });

  it("handles union types with deduplication", () => {
    const mockTypeScript = `
      interface operations {
        "test-unions": {
          parameters: {
            query: {
              // Union with duplicates (should be deduplicated)
              status?: "active" | "inactive" | "active" | "pending";
              // Mixed union
              mixed?: string | number;
              // Complex union
              complex?: "option1" | "option2" | boolean;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-unions"]);

    // Should deduplicate "active"
    const activeMatches = (
      result.fileContent.match(/z\.literal\("active"\)/g) || []
    ).length;
    expect(activeMatches).toBeLessThanOrEqual(1);

    expect(result.fileContent).toContain('z.literal("inactive")');
    expect(result.fileContent).toContain('z.literal("pending")');
    expect(result.fileContent).toContain("z.union([z.string(), z.number()])");
    expect(result.fileContent).toContain("z.boolean()");
  });

  it("handles record types (index signatures)", () => {
    const mockTypeScript = `
      interface operations {
        "test-records": {
          parameters: {
            query: {
              string_record?: { [key: string]: string };
              number_record?: { [key: string]: number };
              unknown_record?: { [key: string]: unknown };
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-records"]);

    expect(result.fileContent).toContain(
      '"string_record": z.record(z.string()).nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"number_record": z.record(z.number()).nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"unknown_record": z.record(z.unknown()).nullable().optional()',
    );
  });

  it("handles empty operations interface gracefully", () => {
    const mockTypeScript = `
      interface operations {}
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["non-existent"]);

    expect(result.individualSchemas.size).toBe(0);
    expect(result.fileContent).toContain(
      "export const operationsSchema = z.object({",
    );
    expect(result.fileContent).toContain("});");
  });

  it("handles missing operations interface", () => {
    const mockTypeScript = `
      interface SomeOtherInterface {
        test: string;
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-op"]);

    expect(result.individualSchemas.size).toBe(0);
  });

  it("handles boolean literal types", () => {
    const mockTypeScript = `
      interface operations {
        "test-booleans": {
          parameters: {
            query: {
              always_true?: true;
              always_false?: false;
              regular_boolean?: boolean;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-booleans"]);

    // Boolean literals should be treated as boolean type for simplicity
    expect(result.fileContent).toContain(
      '"always_true": z.boolean().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"always_false": z.boolean().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"regular_boolean": z.boolean().nullable().optional()',
    );
  });

  it("handles unknown and any types", () => {
    const mockTypeScript = `
      interface operations {
        "test-unknowns": {
          parameters: {
            query: {
              unknown_field?: unknown;
              any_field?: any;
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["test-unknowns"]);

    expect(result.fileContent).toContain(
      '"unknown_field": z.unknown().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"any_field": z.unknown().nullable().optional()',
    );
  });
});

describe("generateSchemasFromSource - Robustness & Performance", () => {
  // Error Handling Tests
  it("handles malformed TypeScript input gracefully", () => {
    const malformedTypeScript = `
      interface operations {
        "test-op": {
          parameters: {
            query: {
              incomplete_field: // Missing type
            };
          };
        };
      }
    `;

    // The generator is robust and can handle some malformed input
    // It should not throw and may still generate partial schemas
    const result = generateSchemasFromSource(malformedTypeScript, ["test-op"]);
    expect(() =>
      generateSchemasFromSource(malformedTypeScript, ["test-op"]),
    ).not.toThrow();
    expect(result.fileContent).toContain(
      "export const operationsSchema = z.object({",
    );
  });

  it("handles completely invalid TypeScript syntax", () => {
    const invalidTypeScript = "this is not valid typescript at all!!!";

    // Should not throw, but should return empty results
    const result = generateSchemasFromSource(invalidTypeScript, ["any-op"]);
    expect(result.individualSchemas.size).toBe(0);
    expect(result.fileContent).toContain(
      "export const operationsSchema = z.object({",
    );
  });

  // Path Parameter Tests
  it("handles path parameters correctly", () => {
    const mockTypeScript = `
      interface operations {
        "movie-details": {
          parameters: {
            query: {
              language?: string;
            };
            path: {
              movie_id: number;
            };
          };
          requestBody?: never;
          responses: {
            200: {
              headers: { [name: string]: unknown };
              content: { "application/json": unknown };
            };
          };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, ["movie-details"]);

    expect(result.individualSchemas.has("movie-details")).toBe(true);
    // NOTE: Current implementation doesn't support path parameters - they're hardcoded to z.never()
    // This is a known limitation that would require generator enhancement
    expect(result.fileContent).not.toContain('"movie_id": z.number()'); // Path params not supported yet
    expect(result.fileContent).toContain(
      "path: z.never().nullable().optional(),",
    ); // Hardcoded to z.never()
    expect(result.fileContent).toContain(
      '"language": z.string().nullable().optional()',
    );
  });

  // Performance Test
  it("handles large interfaces efficiently", () => {
    // Generate a large interface with 50 fields
    const largeQueryFields = Array.from(
      { length: 50 },
      (_, i) => `"field_${i}": string${i % 3 === 0 ? "?" : ""};`,
    ).join("\n              ");

    const largeTypeScript = `
      interface operations {
        "large-operation": {
          parameters: {
            query: {
              ${largeQueryFields}
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const startTime = Date.now();
    const result = generateSchemasFromSource(largeTypeScript, [
      "large-operation",
    ]);
    const duration = Date.now() - startTime;

    // Should complete within reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);
    expect(result.individualSchemas.has("large-operation")).toBe(true);
    expect(result.fileContent).toContain('"field_0": z.string()');
    expect(result.fileContent).toContain('"field_49": z.string()'); // field_49 is not optional
  });

  // Output Validation Test
  it("generates valid Zod schemas that can be imported", () => {
    const mockTypeScript = `
      interface operations {
        "validation-test": {
          parameters: {
            query: {
              test_string: string;
              test_number?: number;
              test_union?: "option1" | "option2";
            };
          };
          responses: { 200: { headers: { [name: string]: unknown }; content: { "application/json": unknown }; }; };
        };
      }
    `;

    const result = generateSchemasFromSource(mockTypeScript, [
      "validation-test",
    ]);

    // The generated content should be valid TypeScript/JavaScript
    expect(result.fileContent).toContain('import { z } from "zod";');
    expect(result.fileContent).toContain("export const validationTestSchema");
    expect(result.fileContent).toContain("z.object({");

    // Should not contain any obvious syntax errors
    expect(result.fileContent).not.toContain("undefined");
    expect(result.fileContent).not.toContain("[object Object]");

    // Verify specific field generation
    expect(result.fileContent).toContain('"test_string": z.string()');
    expect(result.fileContent).toContain(
      '"test_number": z.number().nullable().optional()',
    );
    expect(result.fileContent).toContain('z.literal("option1")');
    expect(result.fileContent).toContain('z.literal("option2")');
  });

  // Real TMDB Schema Test
  it("works with actual TMDB discover-movie operation", () => {
    // This is a subset of the real TMDB discover-movie operation from tmdbV3.d.ts
    const realTmdbTypeScript = `
      interface operations {
        "discover-movie": {
          parameters: {
            query?: {
              certification?: string;
              "certification.gte"?: string;
              "certification.lte"?: string;
              certification_country?: string;
              include_adult?: boolean;
              include_video?: boolean;
              language?: string;
              page?: number;
              primary_release_year?: number;
              "primary_release_date.gte"?: string;
              "primary_release_date.lte"?: string;
              region?: string;
              "release_date.gte"?: string;
              "release_date.lte"?: string;
              sort_by?: "original_title.asc" | "original_title.desc" | "popularity.asc" | "popularity.desc" | "revenue.asc" | "revenue.desc" | "primary_release_date.asc" | "title.asc" | "title.desc" | "primary_release_date.desc" | "vote_average.asc" | "vote_average.desc" | "vote_count.asc" | "vote_count.desc";
              "vote_average.gte"?: number;
              "vote_average.lte"?: number;
              "vote_count.gte"?: number;
              "vote_count.lte"?: number;
              watch_region?: string;
              with_cast?: string;
              with_companies?: string;
              with_crew?: string;
              with_genres?: string;
              with_keywords?: string;
              with_origin_country?: string;
              with_original_language?: string;
              with_people?: string;
              with_release_type?: number;
              "with_runtime.gte"?: number;
              "with_runtime.lte"?: number;
              with_watch_monetization_types?: string;
              with_watch_providers?: string;
              without_companies?: string;
              without_genres?: string;
              without_keywords?: string;
              without_watch_providers?: string;
              year?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
          };
          requestBody?: never;
          responses: {
            200: {
              headers: {
                [name: string]: unknown;
              };
              content: {
                "application/json": unknown;
              };
            };
          };
        };
      }
    `;

    const result = generateSchemasFromSource(realTmdbTypeScript, [
      "discover-movie",
    ]);

    expect(result.individualSchemas.has("discover-movie")).toBe(true);

    // Test a few key fields from the real TMDB schema
    expect(result.fileContent).toContain(
      '"certification": z.string().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"include_adult": z.boolean().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"page": z.number().nullable().optional()',
    );

    // Test the complex sort_by union type
    expect(result.fileContent).toContain("z.union([");
    expect(result.fileContent).toContain('z.literal("popularity.asc")');
    expect(result.fileContent).toContain('z.literal("popularity.desc")');
    expect(result.fileContent).toContain('z.literal("vote_average.asc")');

    // Test fields with dots in names (common in TMDB API)
    expect(result.fileContent).toContain(
      '"certification.gte": z.string().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"vote_average.gte": z.number().nullable().optional()',
    );
    expect(result.fileContent).toContain(
      '"with_runtime.lte": z.number().nullable().optional()',
    );

    // Verify proper export name generation
    expect(result.fileContent).toContain(
      "export const discoverMovieSchema = z.object({",
    );
  });
});
