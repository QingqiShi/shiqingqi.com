import { describe, expect, it } from "vitest";
import type { StoredPreference } from "./preference-store";
import {
  formatPreferencesContext,
  isStoredPreference,
  makeId,
} from "./preference-store";

function pref(
  overrides: Partial<StoredPreference> &
    Pick<StoredPreference, "category" | "value" | "sentiment">,
): StoredPreference {
  return {
    id: makeId(overrides.category, overrides.value),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("makeId", () => {
  it("creates composite key from category and lowercase value", () => {
    expect(makeId("genre", "Sci-Fi")).toBe("genre:sci-fi");
  });

  it("handles already-lowercase values", () => {
    expect(makeId("actor", "keanu reeves")).toBe("actor:keanu reeves");
  });

  it("produces the same key for different casings", () => {
    expect(makeId("director", "Christopher Nolan")).toBe(
      makeId("director", "christopher nolan"),
    );
  });
});

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

describe("formatPreferencesContext", () => {
  it("returns null for empty array", () => {
    expect(formatPreferencesContext([])).toBeNull();
  });

  it("formats likes only", () => {
    const ctx = formatPreferencesContext([
      pref({ category: "genre", value: "sci-fi", sentiment: "like" }),
      pref({
        category: "director",
        value: "Denis Villeneuve",
        sentiment: "like",
      }),
    ]);
    expect(ctx).toBe(
      "[User Preferences]\nLikes: sci-fi (genre), Denis Villeneuve (director)",
    );
  });

  it("formats dislikes only", () => {
    const ctx = formatPreferencesContext([
      pref({ category: "genre", value: "horror", sentiment: "dislike" }),
    ]);
    expect(ctx).toBe("[User Preferences]\nDislikes: horror (genre)");
  });

  it("formats both likes and dislikes", () => {
    const ctx = formatPreferencesContext([
      pref({ category: "genre", value: "sci-fi", sentiment: "like" }),
      pref({ category: "genre", value: "horror", sentiment: "dislike" }),
    ]);
    expect(ctx).toContain("[User Preferences]");
    expect(ctx).toContain("Likes: sci-fi (genre)");
    expect(ctx).toContain("Dislikes: horror (genre)");
  });

  it("includes all category types", () => {
    const prefs = [
      pref({ category: "genre", value: "action", sentiment: "like" }),
      pref({ category: "actor", value: "Keanu Reeves", sentiment: "like" }),
      pref({ category: "director", value: "Nolan", sentiment: "like" }),
      pref({ category: "content_rating", value: "PG-13", sentiment: "like" }),
      pref({ category: "language", value: "Korean", sentiment: "like" }),
      pref({ category: "keyword", value: "time travel", sentiment: "like" }),
    ];
    const ctx = formatPreferencesContext(prefs);
    expect(ctx).toContain("action (genre)");
    expect(ctx).toContain("Keanu Reeves (actor)");
    expect(ctx).toContain("Nolan (director)");
    expect(ctx).toContain("PG-13 (content_rating)");
    expect(ctx).toContain("Korean (language)");
    expect(ctx).toContain("time travel (keyword)");
  });
});
