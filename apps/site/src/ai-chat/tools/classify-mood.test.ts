import { describe, expect, it } from "vitest";
import {
  classifyMoodInputSchema,
  createClassifyMoodTool,
  MOOD_VALUES,
} from "./classify-mood";

describe("classifyMoodInputSchema", () => {
  it("accepts every supported mood value", () => {
    for (const mood of MOOD_VALUES) {
      expect(classifyMoodInputSchema.parse({ mood }).mood).toBe(mood);
    }
  });

  it("rejects unknown mood values", () => {
    expect(() => classifyMoodInputSchema.parse({ mood: "spicy" })).toThrow();
  });

  it("rejects missing mood field", () => {
    expect(() => classifyMoodInputSchema.parse({})).toThrow();
  });
});

describe("createClassifyMoodTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createClassifyMoodTool();
    expect(tool.description).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });

  it("execute is a pass-through", async () => {
    const tool = createClassifyMoodTool();
    if (!tool.execute) throw new Error("expected execute");
    const result = await tool.execute(
      { mood: "warm" },
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    );
    expect(result).toEqual({ mood: "warm" });
  });
});
