import { MockLanguageModelV3 } from "ai/test";
import { MOCK_USAGE, userText } from "./create-labelling-model.ts";

/**
 * A mock model that answers a domain guess: it reads the name from the
 * prompt and calls `report_domain` with what `answer` gives, or answers in
 * text only when `answer` gives undefined.
 */
export function createDomainModel(
  answer: (name: string) => string | null | undefined,
) {
  return new MockLanguageModelV3({
    doGenerate: ({ prompt }) => {
      const name = /^Name: (".*")$/m.exec(userText(prompt))?.[1];
      const domain = answer(name === undefined ? "" : String(JSON.parse(name)));
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
