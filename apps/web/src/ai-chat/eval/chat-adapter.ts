import type { UIMessage } from "ai";
import type { SupportedLocale } from "../../types";
import { chat } from "../chat";
import { throttle } from "./throttle";
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

function extractToolCalls(
  steps: ReadonlyArray<{
    toolCalls: ReadonlyArray<{ toolName: string; input: unknown }>;
  }>,
): ToolCallSummary[] {
  return steps.flatMap((step) =>
    step.toolCalls.map((tc) => ({
      toolName: tc.toolName,
      args: tc.input,
    })),
  );
}

export async function sendMessage(
  input: string,
  locale: SupportedLocale = "en",
): Promise<ChatResponse> {
  const messages: UIMessage[] = [createUserMessage(input)];
  await throttle.waitIfNeeded();
  const result = await chat({ messages, locale });
  const [text, steps, totalUsage] = await Promise.all([
    result.text,
    result.steps,
    result.totalUsage,
  ]);
  throttle.record(totalUsage.totalTokens ?? 0);

  return {
    text,
    toolCalls: extractToolCalls(steps),
  };
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
    const [text, steps, totalUsage] = await Promise.all([
      result.text,
      result.steps,
      result.totalUsage,
    ]);
    throttle.record(totalUsage.totalTokens ?? 0);
    const toolCalls = extractToolCalls(steps);

    messages.push(createAssistantMessage(text));
    results.push({ text, toolCalls });
  }

  return results;
}
