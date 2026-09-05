import type { UIMessage } from "ai";
import type { ChatMessageMetadata, ChatMood } from "./chat-message-metadata";

export function findLatestMoodFromMessages(
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>,
): ChatMood | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    if (message.metadata?.mood) {
      return message.metadata.mood;
    }
  }
  return undefined;
}
