import Anthropic from "@anthropic-ai/sdk";
import "server-only";
import { toBatchItem } from "./to-batch-item.ts";
import type { MessageBatchApi } from "./types.ts";

let api: MessageBatchApi | null = null;

/** The Message Batches API of the running app, or null when `ANTHROPIC_API_KEY` is not set. */
export function getAnthropicBatchApi(): MessageBatchApi | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (api) return api;
  const client = new Anthropic({ apiKey });
  api = {
    async create(requests) {
      const batch = await client.messages.batches.create({
        requests: [...requests],
      });
      return { id: batch.id };
    },
    async isEnded(batchId) {
      const batch = await client.messages.batches.retrieve(batchId);
      return batch.processing_status === "ended";
    },
    async *results(batchId) {
      for await (const response of await client.messages.batches.results(
        batchId,
      )) {
        yield toBatchItem(response);
      }
    },
  };
  return api;
}
