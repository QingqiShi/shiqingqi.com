import type { Tool } from "ai";
import { generateText, isStepCount } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { classifyMoodTool } from "./classify-mood-tool";
import { presentMediaTool } from "./present-media-tool";
import { presentPersonTool } from "./present-person-tool";
import { presentProviderRegionsTool } from "./present-provider-regions-tool";
import { presentWatchProvidersTool } from "./present-watch-providers-tool";
import { savePreferenceTool } from "./save-preference-tool";

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const cases: Array<[string, Tool, Record<string, unknown>]> = [
  ["classify_mood", classifyMoodTool, { mood: "warm" }],
  ["present_media", presentMediaTool, { media: [{ id: 1, media_type: "tv" }] }],
  ["present_person", presentPersonTool, { people: [{ id: 287 }] }],
  [
    "present_watch_providers",
    presentWatchProvidersTool,
    { id: 550, media_type: "movie", region: "US" },
  ],
  [
    "present_provider_regions",
    presentProviderRegionsTool,
    { id: 550, media_type: "movie", provider_name: "Netflix" },
  ],
  [
    "save_preference",
    savePreferenceTool,
    {
      preferences: [{ category: "genre", value: "sci-fi", sentiment: "like" }],
    },
  ],
];

describe("tools whose output is their input", () => {
  it.each(cases)(
    "%s returns its input and lets the reply continue",
    async (toolName, tool, input) => {
      let calls = 0;
      const model = new MockLanguageModelV3({
        doGenerate: () =>
          Promise.resolve(
            ++calls === 1
              ? {
                  content: [
                    {
                      type: "tool-call",
                      toolCallId: "call-1",
                      toolName,
                      input: JSON.stringify(input),
                    },
                  ],
                  finishReason: { unified: "tool-calls", raw: undefined },
                  usage,
                  warnings: [],
                }
              : {
                  content: [{ type: "text", text: "Here you go." }],
                  finishReason: { unified: "stop", raw: undefined },
                  usage,
                  warnings: [],
                },
          ),
      });

      const result = await generateText({
        model,
        prompt: "recommend something",
        tools: { [toolName]: tool },
        stopWhen: isStepCount(5),
      });

      expect(result.steps[0].toolResults).toMatchObject([
        { toolName, output: input },
      ]);
      expect(result.text).toBe("Here you go.");
    },
  );
});
