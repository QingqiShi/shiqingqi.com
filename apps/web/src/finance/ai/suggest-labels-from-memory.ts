import { labelsForBankText, type Recall } from "./labels-for-bank-text.ts";
import { labelsForPayee } from "./labels-for-payee.ts";
import { matchPayee } from "./match-payee.ts";
import type { LabelInput, LabelMemory, Suggestion } from "./types.ts";

/**
 * Steps 1 and 2 of the labelling pipeline, with no model: the labels of past
 * bank rows with the same text, else the usual labels of the Payee that has
 * the text as an alias. Null when neither knows the text. When past rows
 * with the text disagree on the Category, `categoryAgrees` is false and the
 * model must decide.
 */
export function suggestLabelsFromMemory(
  input: LabelInput,
  memory: LabelMemory,
): Recall | null {
  const recalled = labelsForBankText(input, memory);
  if (recalled) return recalled;
  const payeeId = matchPayee(input.text, memory);
  if (!payeeId) return null;
  const labels = labelsForPayee(payeeId, input.accountId, memory);
  if (labels.categoryId === null) return null;
  const suggestion: Suggestion = {
    payeeId,
    categoryId: labels.categoryId,
    tagIds: labels.tagIds,
    memberId: labels.memberId,
    confidence: labels.confidence,
    source: "alias",
  };
  if (labels.askForTags) suggestion.askForTags = true;
  return { suggestion, categoryAgrees: true };
}
