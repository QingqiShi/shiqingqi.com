import type {
  BatchItemOutcome,
  BatchRequest,
  MessageBatchApi,
} from "../types.ts";

export const TEST_USAGE = {
  input: 1000,
  output: 200,
  cacheRead: 800,
  cacheWrite: 0,
};

/** A successful answer of the model, as the results file gives it. */
export function answer(output: unknown): BatchItemOutcome {
  return {
    type: "succeeded",
    text: JSON.stringify(output),
    stopReason: "end_turn",
    usage: TEST_USAGE,
  };
}

/**
 * An in-memory Message Batches API. `respond` answers each request when its
 * batch ends; a batch ends at once unless `holdBatches` is set.
 */
export function createFakeBatchApi(
  respond: (request: BatchRequest) => BatchItemOutcome,
) {
  const batches = new Map<string, BatchRequest[]>();
  const state = { holdBatches: false, failNextCreate: false };
  const api: MessageBatchApi = {
    create(requests) {
      if (state.failNextCreate) {
        state.failNextCreate = false;
        return Promise.reject(new Error("The API refused the batch"));
      }
      const id = `msgbatch_${String(batches.size + 1)}`;
      batches.set(id, [...requests]);
      return Promise.resolve({ id });
    },
    isEnded: () => Promise.resolve(!state.holdBatches),
    async *results(batchId) {
      await Promise.resolve();
      for (const request of batches.get(batchId) ?? []) {
        yield { customId: request.custom_id, outcome: respond(request) };
      }
    },
  };
  return { api, batches, state };
}
