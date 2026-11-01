import type { Question, ResultFor } from "@typesafe-ai/sdk";
import type { FoundTransaction } from "../db/repositories/transaction-search-repository.ts";
import { TAG_AT, type LabellingModel } from "./label-bank-rows.ts";
import {
  quickAddCandidates,
  type QuickAddCandidates,
} from "./quick-add-candidates.ts";
import {
  NEW_TRANSACTION,
  quickAddQuestions,
  quickAddState,
  type QuickAddChoices,
} from "./quick-add-questions.ts";
import {
  householdQuestions,
  outcomeProbability,
  requestQuestions,
  type HouseholdQuestions,
  type Options,
} from "./row-questions.ts";
import type {
  LabellingContext,
  QuickAddGuess,
  QuickAddResponse,
} from "./types.ts";

type Answers = Readonly<Partial<Record<string, ResultFor<Question>>>>;

export class UnreadableAnswer extends Error {}

/**
 * The chosen value with the probability of every label that leads to the
 * same outcome, and the value of the strongest label that leads elsewhere.
 */
function guessOf<Value>(
  answers: Answers,
  id: string,
  options: Options<Value> | undefined,
): QuickAddGuess<Value> | null {
  if (!options) return null;
  const answer = answers[id];
  if (answer?.type !== "choice") throw new UnreadableAnswer(`No ${id} answer`);
  const value = options.values.get(answer.choice);
  if (value === undefined) throw new UnreadableAnswer(`Unknown ${id} answer`);
  const outcome = options.outcomes.get(answer.choice);
  let runnerUp: { label: string; probability: number } | undefined;
  for (const [label, each] of options.outcomes) {
    const p = answer.probabilities[label] ?? 0;
    if (each !== outcome && (!runnerUp || p > runnerUp.probability)) {
      runnerUp = { label, probability: p };
    }
  }
  const probability = outcomeProbability(options, answer);
  const runnerUpValue = runnerUp && options.values.get(runnerUp.label);
  return runnerUpValue === undefined
    ? { value, probability }
    : { value, probability, runnerUp: runnerUpValue };
}

/** A value that code found and that no question asked about. */
function certain<Value>(value: Value): QuickAddGuess<Value> {
  return { value, probability: 1 };
}

/** Jev's answers about one quick-add line, read for every kind. */
export type QuickAddReading = Omit<QuickAddResponse, "text">;

function readAnswers(
  choices: QuickAddChoices,
  candidates: QuickAddCandidates,
  household: HouseholdQuestions,
  answers: Answers,
): QuickAddReading {
  const kind = guessOf(answers, "kind", choices.kind);
  const payee = guessOf(answers, "payee", choices.payee);
  if (!kind || !payee) throw new UnreadableAnswer("No kind or payee");
  const onlyAmount = candidates.amounts.at(0);
  return {
    kind,
    amountMinor:
      guessOf(answers, "amount", choices.amount) ??
      (onlyAmount ? certain(onlyAmount.amountMinor) : null),
    date:
      guessOf(answers, "date", choices.date) ??
      certain(candidates.dates[0].date),
    accountId: guessOf(answers, "account", choices.account),
    expenseCategoryId: guessOf(
      answers,
      "expenseCategory",
      choices.expenseCategory,
    ),
    incomeCategoryId: guessOf(
      answers,
      "incomeCategory",
      choices.incomeCategory,
    ),
    payee,
    paysDownAccountId: guessOf(answers, "paysDown", choices.paysDown),
    fromAccountId: guessOf(answers, "fromAccount", choices.fromAccount),
    toAccountId: guessOf(answers, "toAccount", choices.toAccount),
    memberId: guessOf(answers, "member", choices.member),
    tagIds: household.tags.flatMap((tag) => {
      const answer = answers[tag.tagId];
      if (answer?.type !== "noul") throw new UnreadableAnswer("No tag answer");
      return answer.noul >= TAG_AT ? [tag.tagId] : [];
    }),
  };
}

/**
 * Asks Jev what a quick-add line means, in one request. Code first finds
 * the amounts, days and new Payee names in `text`; Jev chooses among them
 * and the Household's accounts, Categories, Payees, Members and Tags, with
 * `past` as evidence. Throws {@link UnreadableAnswer} when an answer cannot
 * be read; a failing request throws its own error.
 */
export async function readQuickAdd(
  model: LabellingModel,
  context: LabellingContext,
  text: string,
  today: string,
  past: readonly FoundTransaction[],
): Promise<QuickAddReading> {
  const household = householdQuestions(context, NEW_TRANSACTION);
  const candidates = quickAddCandidates(text, context.baseCurrency, today);
  const choices = quickAddQuestions(household, text, candidates, past);
  const { answers } = await model.systemOne({
    state: quickAddState(household, text, today, past),
    questions: requestQuestions(choices, household.tags),
  });
  return readAnswers(choices, candidates, household, answers);
}
