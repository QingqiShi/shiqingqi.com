import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";
import type { BatchItem } from "./types.ts";

/** Reads one line of a batch's results file. */
export function toBatchItem(
  response: MessageBatchIndividualResponse,
): BatchItem {
  const { custom_id: customId, result } = response;
  switch (result.type) {
    case "succeeded": {
      const { message } = result;
      return {
        customId,
        outcome: {
          type: "succeeded",
          text: message.content
            .flatMap((block) => (block.type === "text" ? [block.text] : []))
            .join(""),
          stopReason: message.stop_reason,
          usage: {
            input: message.usage.input_tokens,
            output: message.usage.output_tokens,
            cacheRead: message.usage.cache_read_input_tokens ?? 0,
            cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
          },
        },
      };
    }
    case "errored":
      return {
        customId,
        outcome: {
          type: "failed",
          reason: `errored:${result.error.error.type}`,
        },
      };
    case "canceled":
    case "expired":
      return { customId, outcome: { type: "failed", reason: result.type } };
  }
}
