import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { generateCreatureLore } from "./generate-creature-lore";

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
    const lore = {
      nameSuggestion: "Sproutling",
      loreEn: "A gentle sprout that hums when the sun rises.",
      loreZh: "黎明时分会哼歌的小芽。",
      type: "leaf",
    };

    const result = await generateCreatureLore(jsonModel(lore), {
      def: DEFAULT_CREATURE,
      locale: "en",
    });

    expect(result).toEqual(lore);
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
