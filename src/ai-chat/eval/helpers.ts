import { createAnthropic } from "@ai-sdk/anthropic";
import type { UIMessage } from "ai";
import { convertToModelMessages, generateText } from "ai";
import { getChatSystemInstructions } from "#src/ai-chat/system-instructions.ts";

const MODEL_ID = "claude-sonnet-4-6";

let cachedModel: ReturnType<ReturnType<typeof createAnthropic>["chat"]> | null =
  null;

function getEvalModel() {
  if (!cachedModel) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Set it in .env.local or export it before running evals.",
      );
    }
    const anthropic = createAnthropic({ apiKey });
    cachedModel = anthropic.chat(MODEL_ID);
  }
  return cachedModel;
}

let messageIdCounter = 0;

function buildUIMessages(
  messages: ReadonlyArray<{ role: "user" | "assistant"; content: string }>,
): UIMessage[] {
  return messages.map((msg) => ({
    id: `eval-msg-${++messageIdCounter}`,
    role: msg.role,
    parts: [{ type: "text" as const, text: msg.content }],
    createdAt: new Date(),
  }));
}

interface GenerateOptions {
  messages: UIMessage[];
  locale: "en" | "zh";
}

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("overloaded")
    );
  }
  return false;
}

async function generateWithRetry({ messages, locale }: GenerateOptions) {
  const system = getChatSystemInstructions(locale);
  const modelMessages = await convertToModelMessages(messages);

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateText({
        model: getEvalModel(),
        system,
        messages: modelMessages,
      });
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES && isNetworkError(error)) {
        const backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

type GenerateResult = Awaited<ReturnType<typeof generateText>>;

interface TurnResult {
  responseText: string;
  usage: GenerateResult["usage"];
}

interface MultiTurnOptions {
  turns: ReadonlyArray<{ userMessage: string }>;
  locale: "en" | "zh";
}

async function runMultiTurn({
  turns,
  locale,
}: MultiTurnOptions): Promise<TurnResult[]> {
  const accumulatedMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];
  const results: TurnResult[] = [];

  for (const turn of turns) {
    accumulatedMessages.push({ role: "user", content: turn.userMessage });

    const uiMessages = buildUIMessages(accumulatedMessages);
    const result = await generateWithRetry({ messages: uiMessages, locale });

    accumulatedMessages.push({ role: "assistant", content: result.text });

    results.push({
      responseText: result.text,
      usage: result.usage,
    });
  }

  return results;
}

export async function generateResponse(
  input: string,
  locale: "en" | "zh" = "en",
) {
  const messages = buildUIMessages([{ role: "user", content: input }]);
  const result = await generateWithRetry({ messages, locale });
  return result.text;
}

export async function generateMultiTurnResponse(
  turns: ReadonlyArray<{ userMessage: string }>,
  locale: "en" | "zh" = "en",
) {
  const results = await runMultiTurn({ turns, locale });
  return results;
}
