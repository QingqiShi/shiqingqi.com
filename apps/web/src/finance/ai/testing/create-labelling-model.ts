import { MockLanguageModelV3 } from "ai/test";

export interface ModelLabel {
  payeeName: string;
  categoryId: string;
  tagIds?: string[];
  memberId?: string | null;
  confidence: number;
}

interface PromptMessage {
  role: string;
  content: string | readonly { type: string; text?: string }[];
}

/** The text of the user messages of a prompt. */
export function userText(prompt: readonly PromptMessage[]) {
  return prompt
    .filter((message) => message.role === "user")
    .flatMap((message) =>
      typeof message.content === "string"
        ? [message.content]
        : message.content.map((part) => part.text ?? ""),
    )
    .join("\n");
}

/**
 * A mock model that answers every numbered bank line of the prompt with the
 * labels `label` gives for that line's bank text.
 */
export function createLabellingModel(label: (text: string) => ModelLabel) {
  return new MockLanguageModelV3({
    doGenerate: (options) => {
      const lines = [
        ...userText(options.prompt).matchAll(/^(\d+)\. .*· "(.*)"$/gm),
      ];
      const results = lines.map(([, index, text]) => ({
        index: Number(index),
        tagIds: [],
        memberId: null,
        reason: "test",
        ...label(text),
      }));
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify({ results }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 10,
            noCache: 10,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 10, text: 10, reasoning: undefined },
        },
        warnings: [],
      });
    },
  });
}
