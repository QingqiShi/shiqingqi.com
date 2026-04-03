import { describe, expect, it } from "vitest";
import type { StoredPreference } from "./preference-store";
import { formatPreferencesContext, makeId } from "./preference-store";

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
