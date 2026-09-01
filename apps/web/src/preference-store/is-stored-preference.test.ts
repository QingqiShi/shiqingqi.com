import { describe, expect, it } from "vitest";
import { isStoredPreference } from "./is-stored-preference";

describe("isStoredPreference", () => {
  it("accepts a valid preference object", () => {
    expect(
      isStoredPreference({
        id: "genre:sci-fi",
        category: "genre",
        value: "sci-fi",
        sentiment: "like",
        updatedAt: Date.now(),
      }),
    ).toBe(true);
  });

  it("accepts all valid categories", () => {
    const categories = [
      "genre",
      "actor",
      "director",
      "content_rating",
      "language",
      "keyword",
    ];
    for (const category of categories) {
      expect(
        isStoredPreference({
          id: `${category}:test`,
          category,
          value: "test",
          sentiment: "like",
          updatedAt: 0,
        }),
      ).toBe(true);
    }
  });

  it("accepts both sentiment values", () => {
    for (const sentiment of ["like", "dislike"]) {
      expect(
        isStoredPreference({
          id: "genre:test",
          category: "genre",
          value: "test",
          sentiment,
          updatedAt: 0,
        }),
      ).toBe(true);
    }
  });

  it("rejects null", () => {
    expect(isStoredPreference(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isStoredPreference(undefined)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isStoredPreference("string")).toBe(false);
    expect(isStoredPreference(42)).toBe(false);
    expect(isStoredPreference(true)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(isStoredPreference([])).toBe(false);
  });

  it("rejects objects with missing fields", () => {
    expect(isStoredPreference({ id: "genre:test" })).toBe(false);
    expect(
      isStoredPreference({
        id: "genre:test",
        category: "genre",
        value: "test",
        sentiment: "like",
        // missing updatedAt
      }),
    ).toBe(false);
  });

  it("rejects objects with invalid category", () => {
    expect(
      isStoredPreference({
        id: "invalid:test",
        category: "invalid",
        value: "test",
        sentiment: "like",
        updatedAt: 0,
      }),
    ).toBe(false);
  });

  it("rejects objects with invalid sentiment", () => {
    expect(
      isStoredPreference({
        id: "genre:test",
        category: "genre",
        value: "test",
        sentiment: "neutral",
        updatedAt: 0,
      }),
    ).toBe(false);
  });

  it("rejects objects with wrong field types", () => {
    expect(
      isStoredPreference({
        id: 123,
        category: "genre",
        value: "test",
        sentiment: "like",
        updatedAt: 0,
      }),
    ).toBe(false);
    expect(
      isStoredPreference({
        id: "genre:test",
        category: "genre",
        value: "test",
        sentiment: "like",
        updatedAt: "not-a-number",
      }),
    ).toBe(false);
  });
});
