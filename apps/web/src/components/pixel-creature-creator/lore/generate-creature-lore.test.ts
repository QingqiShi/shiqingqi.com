import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../state/creature-schema";
import { generateCreatureLore, SYSTEM_PROMPT } from "./generate-creature-lore";

function jsonModel(payload: unknown) {
  return new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(payload) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 5,
            noCache: 5,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 25, text: 25, reasoning: undefined },
        },
        warnings: [],
      }),
  });
}

describe("generateCreatureLore", () => {
  it("returns parsed lore from a stubbed model", async () => {
    const model = jsonModel({
      nameSuggestion: "Sproutling",
      loreEn: "A gentle sprout that hums when the sun rises.",
      loreZh: "黎明时分会哼歌的小芽。",
      type: "leaf",
    });

    const result = await generateCreatureLore(model, {
      def: DEFAULT_CREATURE,
      locale: "en",
    });

    expect(result.nameSuggestion).toBe("Sproutling");
    expect(result.loreEn).toContain("sprout");
    expect(result.loreZh).toMatch(/.{1,120}/);
    expect(result.type).toBe("leaf");
  });

  it("threads creature attributes into the user prompt", async () => {
    const model = jsonModel({
      nameSuggestion: "Tideflit",
      loreEn: "A breezy tide-skipper that hops between waves.",
      loreZh: "在浪尖跳跃的小潮汐。",
      type: "tide",
    });

    await generateCreatureLore(model, {
      def: {
        ...DEFAULT_CREATURE,
        species: "feline",
        accessories: ["bow"],
        type: "tide",
        defaultEmotion: "joy",
        name: "Bubbly",
      },
      locale: "zh",
    });

    expect(model.doGenerateCalls).toHaveLength(1);
    const call = model.doGenerateCalls[0];
    // The provider sees the messages list with system + user roles. The
    // user content carries the creature description we threaded in.
    const userMessage = call.prompt.find((m) => m.role === "user");
    expect(userMessage).toBeDefined();
    const userContent = JSON.stringify(userMessage);
    expect(userContent).toContain("feline");
    expect(userContent).toContain("bow");
    expect(userContent).toContain("tide");
    expect(userContent).toContain("joy");
    expect(userContent).toContain("Bubbly");
    expect(userContent).toContain("zh");
  });

  it("propagates a model error to the caller", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("upstream failure")),
    });

    await expect(
      generateCreatureLore(model, {
        def: DEFAULT_CREATURE,
        locale: "en",
      }),
    ).rejects.toThrow();
  });

  it("system prompt avoids naming trademarked franchises or brands", () => {
    // The prompt should describe brand-safety in generic terms instead of
    // invoking the very names we're trying to keep out of the model's output.
    const lower = SYSTEM_PROMPT.toLowerCase();
    const forbidden = ["pokemon", "pokémon", "digimon", "yu-gi-oh", "yugioh"];
    for (const token of forbidden) {
      expect(
        lower.includes(token),
        `system prompt should not mention "${token}"`,
      ).toBe(false);
    }
  });

  it("rejects malformed model output via the schema", async () => {
    // Missing the loreZh field — generateObject should surface the validation
    // error rather than silently producing a half-formed lore object.
    const model = jsonModel({
      nameSuggestion: "Whisper",
      loreEn: "A quiet creature with no Chinese line.",
      type: "leaf",
    });

    await expect(
      generateCreatureLore(model, {
        def: DEFAULT_CREATURE,
        locale: "en",
      }),
    ).rejects.toThrow();
  });
});
