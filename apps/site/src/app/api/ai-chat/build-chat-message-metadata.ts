import type { TextStreamPart, ToolSet } from "ai";
import type { ChatMessageMetadata } from "#src/ai-chat/chat-message-metadata.ts";
import { classifyMoodInputSchema } from "#src/ai-chat/tools/classify-mood.ts";

export function buildChatMessageMetadata(
  part: TextStreamPart<ToolSet>,
  sessionId: string,
): ChatMessageMetadata | undefined {
  if (part.type === "tool-call" && part.toolName === "classify_mood") {
    const parsed = classifyMoodInputSchema.safeParse(part.input);
    if (parsed.success) {
      return { mood: parsed.data.mood };
    }
    console.warn("classify_mood tool-call payload failed validation", {
      toolCallId: part.toolCallId,
    });
    return undefined;
  }
  if (part.type === "finish-step") {
    return { inputTokens: part.usage.inputTokens, sessionId };
  }
  return undefined;
}
