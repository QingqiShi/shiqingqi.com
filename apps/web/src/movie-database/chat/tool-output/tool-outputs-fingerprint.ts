import { isToolUIPart, type UIMessage } from "ai";

// Fingerprint identifying the set of resolved tool outputs across a conversation.
// Stable across text-streaming chunks (new message/array refs don't change it),
// but changes when a tool output is added OR when messages are replaced with a
// different set (e.g. continueSession / regenerate). Used to key a memoization
// cache without deep-comparing tool outputs.
export function toolOutputsFingerprint(
  messages: ReadonlyArray<UIMessage>,
): string {
  let fingerprint = "";
  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue;
      if (part.state !== "output-available") continue;
      fingerprint += `${part.toolCallId}|`;
    }
  }
  return fingerprint;
}
