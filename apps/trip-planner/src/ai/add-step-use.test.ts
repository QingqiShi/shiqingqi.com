import type { LanguageModelUsage } from "ai";
import { expect, it } from "vitest";
import { addStepUse } from "./add-step-use.ts";
import { emptyUse } from "./empty-use.ts";

const stepUsage = {
  inputTokens: 1300,
  inputTokenDetails: {
    noCacheTokens: 300,
    cacheReadTokens: 900,
    cacheWriteTokens: 100,
  },
  outputTokens: 70,
  outputTokenDetails: { textTokens: 70, reasoningTokens: 0 },
  totalTokens: 1370,
} satisfies LanguageModelUsage;

it("logs the step's usage when the API did not compact", () => {
  const use = emptyUse();
  addStepUse(use, { usage: stepUsage });
  expect(use).toEqual({
    rounds: 1,
    inputTokens: 1300,
    outputTokens: 70,
    cacheReadTokens: 900,
    cacheWriteTokens: 100,
  });
});

it("logs every billed pass of a step in which the API compacted", () => {
  const use = emptyUse();
  addStepUse(use, {
    usage: stepUsage,
    providerMetadata: {
      anthropic: {
        iterations: [
          {
            type: "compaction",
            inputTokens: 200,
            outputTokens: 40,
            cacheReadInputTokens: 100_000,
          },
          {
            type: "message",
            inputTokens: 100,
            outputTokens: 30,
            cacheReadInputTokens: 900,
            cacheCreationInputTokens: 100,
          },
        ],
      },
    },
  });
  expect(use).toEqual({
    rounds: 1,
    inputTokens: 101_300,
    outputTokens: 70,
    cacheReadTokens: 100_900,
    cacheWriteTokens: 100,
  });
});
