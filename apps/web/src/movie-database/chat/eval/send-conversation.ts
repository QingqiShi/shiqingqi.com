import type { SupportedLocale } from "@tuja/i18n/types";
import type { UIMessage } from "ai";
import { throttle } from "#src/eval/throttle.ts";
import { chat } from "#src/movie-database/chat/chat.ts";
import { isRecord } from "#src/movie-database/is-record.ts";
import type { ChatResponse, ToolCallSummary } from "./types";

function createUserMessage(content: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: content }],
  };
}

function createAssistantMessage(text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

function listReturnedTitles(output: unknown): string[] | undefined {
  if (!Array.isArray(output)) return undefined;
  const titles: string[] = [];
  for (const entry of output) {
    if (!isRecord(entry) || typeof entry.id !== "number") continue;
    const title =
      typeof entry.title === "string"
        ? entry.title
        : typeof entry.name === "string"
          ? entry.name
          : "?";
    const mediaType =
      typeof entry.media_type === "string" ? entry.media_type : "?";
    titles.push(`${title} (${mediaType}:${String(entry.id)})`);
  }
  return titles;
}

function extractToolCalls(
  steps: ReadonlyArray<{
    toolCalls: ReadonlyArray<{
      toolCallId: string;
      toolName: string;
      input: unknown;
    }>;
    toolResults: ReadonlyArray<{ toolCallId: string; output: unknown }>;
  }>,
): ToolCallSummary[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => {
      const result = step.toolResults.find(
        (r) => r.toolCallId === tc.toolCallId,
      );
      return {
        toolName: tc.toolName,
        args: tc.input,
        returnedTitles: listReturnedTitles(result?.output),
      };
    }),
  );
}

export async function sendConversation(
  turns: ReadonlyArray<{ content: string }>,
  locale: SupportedLocale = "en",
): Promise<ChatResponse[]> {
  const messages: UIMessage[] = [];
  const results: ChatResponse[] = [];

  for (const turn of turns) {
    messages.push(createUserMessage(turn.content));
    await throttle.waitIfNeeded();
    const result = await chat({ messages, locale });
    const [steps, usage] = await Promise.all([result.steps, result.usage]);
    // `result.text` holds only the last step. The user sees the text of every step.
    const text = steps
      .map((step) => step.text)
      .filter((stepText) => stepText.length > 0)
      .join("\n\n");
    throttle.record(usage.totalTokens ?? 0);
    const toolCalls = extractToolCalls(steps);

    messages.push(createAssistantMessage(text));
    results.push({ text, toolCalls });
  }

  return results;
}
