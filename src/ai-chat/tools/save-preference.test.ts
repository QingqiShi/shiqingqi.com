import { describe, expect, it } from "vitest";
import {
  createSavePreferenceTool,
  savePreferenceInputSchema,
} from "./save-preference";

describe("savePreferenceInputSchema", () => {
  it("accepts valid input", () => {
    const result = savePreferenceInputSchema.parse({
      preferences: [
        { category: "genre", value: "sci-fi", sentiment: "like" },
        { category: "director", value: "Christopher Nolan", sentiment: "like" },
      ],
    });
    expect(result.preferences).toHaveLength(2);
  });

  it("accepts empty preferences array", () => {
    const result = savePreferenceInputSchema.parse({ preferences: [] });
    expect(result.preferences).toEqual([]);
  });

  it("accepts all valid categories", () => {
    const categories = [
      "genre",
      "actor",
      "director",
      "content_rating",
      "language",
      "keyword",
    ] as const;
    for (const category of categories) {
      const result = savePreferenceInputSchema.parse({
        preferences: [{ category, value: "test", sentiment: "like" }],
      });
      expect(result.preferences[0].category).toBe(category);
    }
  });

  it("rejects missing preferences field", () => {
    expect(() => savePreferenceInputSchema.parse({})).toThrow();
  });

  it("rejects invalid category", () => {
    expect(() =>
      savePreferenceInputSchema.parse({
        preferences: [{ category: "mood", value: "happy", sentiment: "like" }],
      }),
    ).toThrow();
  });

  it("rejects invalid sentiment", () => {
    expect(() =>
      savePreferenceInputSchema.parse({
        preferences: [
          { category: "genre", value: "horror", sentiment: "neutral" },
        ],
      }),
    ).toThrow();
  });

  it("rejects non-string value", () => {
    expect(() =>
      savePreferenceInputSchema.parse({
        preferences: [{ category: "genre", value: 42, sentiment: "like" }],
      }),
    ).toThrow();
  });
});

describe("createSavePreferenceTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createSavePreferenceTool();
    expect(tool.description).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });

  it("execute is a pass-through", async () => {
    const tool = createSavePreferenceTool();
    const input = {
      preferences: [
        {
          category: "genre" as const,
          value: "sci-fi",
          sentiment: "like" as const,
        },
        {
          category: "actor" as const,
          value: "Keanu Reeves",
          sentiment: "like" as const,
        },
      ],
    };
    if (!tool.execute) throw new Error("expected execute");
    const result = await tool.execute(input, {
      toolCallId: "test",
      messages: [],
      abortSignal: AbortSignal.timeout(5000),
    });
    expect(result).toEqual(input);
  });
});
