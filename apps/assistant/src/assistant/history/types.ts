import type { BatchCreateParams } from "@anthropic-ai/sdk/resources/messages/batches";

export type BatchRequest = BatchCreateParams.Request;

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** The answer to one request of a batch. */
export type BatchItemOutcome =
  | {
      type: "succeeded";
      /** The text blocks of the message, joined. */
      text: string;
      stopReason: string | null;
      usage: TokenUsage;
    }
  | { type: "failed"; reason: string };

export interface BatchItem {
  customId: string;
  outcome: BatchItemOutcome;
}

/**
 * The part of the Anthropic Message Batches API that history import uses.
 * `anthropicBatchApi` is the real one, `createFakeBatchApi` the one for tests.
 */
export interface MessageBatchApi {
  create(requests: readonly BatchRequest[]): Promise<{ id: string }>;
  /** True when every request of the batch has an answer. */
  isEnded(batchId: string): Promise<boolean>;
  /** The answers of an ended batch, in any order. */
  results(batchId: string): AsyncIterable<BatchItem>;
}
