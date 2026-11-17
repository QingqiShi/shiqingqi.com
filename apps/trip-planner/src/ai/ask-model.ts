import { generateText, type LanguageModel, type ModelMessage } from "ai";
import type { Checked } from "./check-proposal.ts";

/** One request, and then at most two more that each give the model the reason its answer failed. */
const MAX_ROUNDS = 3;

/** What the requests to the model used, so far. */
export interface ModelUse {
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type Outcome<T> =
  | { status: "ok"; value: T }
  /** The model gave no answer that applies, after each repair. */
  | { status: "invalid"; reason: string }
  /** The request to the model failed. */
  | { status: "failed"; reason: string }
  /** The signal stopped the request. */
  | { status: "aborted" };

export interface Ask<T> {
  model: LanguageModel;
  instructions: string;
  /**
   * The first message, in parts. The provider keeps each part before the
   * last for a short time, so that the next ask with the same start, such as
   * another change to the same trip, reads it at a lower price.
   */
  message: readonly string[];
  /** The value of the model's text, or why it cannot be used. */
  check: (text: string) => Checked<T>;
  maxOutputTokens: number;
  signal: AbortSignal;
  /** Gets the counts of each request as it ends, so that a caller can log them also when a later request fails. */
  use: ModelUse;
}

export function emptyUse(): ModelUse {
  return {
    rounds: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}

/**
 * Asks the model, and checks its answer. When the answer fails the check,
 * it gives the model the reason and asks again, at most twice.
 */
export async function askModel<T>(ask: Ask<T>): Promise<Outcome<T>> {
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: ask.message.map((text, i) => ({
        type: "text",
        text,
        ...(i < ask.message.length - 1 && {
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        }),
      })),
    },
  ];
  let reason = "";
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    ask.use.rounds = round;
    let text: string;
    try {
      const result = await generateText({
        model: ask.model,
        instructions: ask.instructions,
        messages,
        maxOutputTokens: ask.maxOutputTokens,
        reasoning: "low",
        maxRetries: 1,
        abortSignal: ask.signal,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      });
      ask.use.inputTokens += result.usage.inputTokens ?? 0;
      ask.use.outputTokens += result.usage.outputTokens ?? 0;
      ask.use.cacheReadTokens +=
        result.usage.inputTokenDetails.cacheReadTokens ?? 0;
      ask.use.cacheWriteTokens +=
        result.usage.inputTokenDetails.cacheWriteTokens ?? 0;
      if (result.finishReason === "length") {
        return {
          status: "invalid",
          reason: "The answer was longer than the model may write.",
        };
      }
      if (result.finishReason === "content-filter") {
        return { status: "invalid", reason: "The model declined to answer." };
      }
      text = result.text;
    } catch (error) {
      if (ask.signal.aborted) return { status: "aborted" };
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    const checked = ask.check(text);
    if (checked.ok) return { status: "ok", value: checked.value };
    reason = checked.reason;
    messages.push(
      { role: "assistant", content: text },
      {
        role: "user",
        content: `The app cannot apply that answer: ${reason}\nAnswer again with the whole JSON object, fixed.`,
      },
    );
  }
  return { status: "invalid", reason };
}
