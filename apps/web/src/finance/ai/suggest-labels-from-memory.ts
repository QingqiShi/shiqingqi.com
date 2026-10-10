import { labelsForPayee } from "./labels-for-payee.ts";
import { matchPayee } from "./match-payee.ts";
import type { LabelInput, LabelMemory, Suggestion } from "./types.ts";

/**
 * Steps 1 and 2 of the labelling pipeline, with no model: a Payee alias hit,
 * else the most alike Payee name. Null when no Payee fits or the Payee has
 * no Category to give. Runs on the server and on the Replica.
 */
export function suggestLabelsFromMemory(
  input: LabelInput,
  memory: LabelMemory,
): Suggestion | null {
  const match = matchPayee(input.text, memory);
  if (!match) return null;
  const labels = labelsForPayee(match.payeeId, input.accountId, memory);
  if (labels.categoryId === null) return null;
  return {
    payeeId: match.payeeId,
    categoryId: labels.categoryId,
    tagIds: labels.tagIds,
    memberId: labels.memberId,
    confidence: labels.confidence * match.score,
    source: match.source,
  };
}
