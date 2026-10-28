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
