import { describe, expect, it } from "vitest";
import {
  createPresentMediaTool,
  presentMediaInputSchema,
} from "./present-media";

describe("presentMediaInputSchema", () => {
  it("accepts valid input", () => {
    const result = presentMediaInputSchema.parse({
      media: [
        { id: 1, media_type: "movie" },
        { id: 2, media_type: "tv" },
      ],
    });
    expect(result.media).toHaveLength(2);
  });

  it("accepts empty media array", () => {
    const result = presentMediaInputSchema.parse({ media: [] });
    expect(result.media).toEqual([]);
  });

  it("rejects missing media field", () => {
    expect(() => presentMediaInputSchema.parse({})).toThrow();
  });

  it("rejects invalid media_type", () => {
    expect(() =>
      presentMediaInputSchema.parse({
        media: [{ id: 1, media_type: "person" }],
      }),
    ).toThrow();
  });

  it("rejects non-numeric id", () => {
    expect(() =>
      presentMediaInputSchema.parse({
        media: [{ id: "abc", media_type: "movie" }],
      }),
    ).toThrow();
  });
});

describe("createPresentMediaTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createPresentMediaTool();
    expect(tool.description).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });

  it("execute is a pass-through", async () => {
    const tool = createPresentMediaTool();
    const input = {
      media: [
        { id: 1, media_type: "movie" as const },
        { id: 2, media_type: "tv" as const },
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
