interface PromptMessage {
  role: string;
  content: string | readonly { type: string; text?: string }[];
}

/** The token usage every mock model reports. */
export const MOCK_USAGE = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

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
