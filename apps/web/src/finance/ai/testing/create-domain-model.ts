import { MockLanguageModelV3 } from "ai/test";
import { MOCK_USAGE } from "./create-labelling-model.ts";

/**
 * A mock model that answers a domain guess: it calls `report_domain` with
 * `domain`, or answers in text only when `domain` is undefined.
 */
export function createDomainModel(domain: string | null | undefined) {
  return new MockLanguageModelV3({
    doGenerate: () => {
      return Promise.resolve({
        content:
          domain === undefined
            ? [{ type: "text", text: "I am not sure." }]
            : [
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "report_domain",
                  input: JSON.stringify({ domain }),
                },
              ],
        finishReason:
          domain === undefined
            ? { unified: "stop", raw: "end_turn" }
            : { unified: "tool-calls", raw: "tool_use" },
        usage: MOCK_USAGE,
        warnings: [],
      });
    },
  });
}
