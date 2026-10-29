import { MockLanguageModelV3 } from "ai/test";
import type { InstructionChange } from "../types.ts";
import { MOCK_USAGE } from "./mock-usage.ts";

/** A mock model for "Teach the AI" that drafts `change`, or fails when `change` is null. */
export function createTeachingModel(change: InstructionChange | null) {
  return new MockLanguageModelV3({
    doGenerate: () => {
      if (change === null) {
        return Promise.reject(new Error("The provider is down"));
      }
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(change) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: MOCK_USAGE,
        warnings: [],
      });
    },
  });
}
