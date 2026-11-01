import type {
  ChoiceResponse,
  Question,
  ResultFor,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import { forEachLimited } from "../domain/for-each-limited.ts";
import {
  findPastTransactions,
  type SearchTransactions,
} from "./find-past-transactions.ts";
import {
  householdQuestions,
  outcomeProbability,
  requestQuestions,
  rowQuestions,
  rowState,
  type Kind,
  type Options,
  type PayeeChoice,
  type RowChoices,
  type TagQuestion,
  type TransferTarget,
} from "./row-questions.ts";
import type { LabellingContext, RowToLabel } from "./types.ts";

/** The System One model that labels bank rows. */
export type LabellingModel = Pick<TypeSafeClient, "systemOne">;

/** The most bank rows one run of the labeller reads together, so that it can pair the two sides of a transfer. */
export const LABEL_BATCH_SIZE = 20;
/** The most rows the labeller asks about at the same time. */
const CONCURRENCY = 5;
/** An answer that Jev gives less probability than this puts the row in Review. */
const REVIEW_BELOW = 0.6;
/** A Tag applies when Jev gives it at least this probability. */
export const TAG_AT = 0.5;
const MAX_REASON_LENGTH = 500;

/** The labels the model chose for one bank row, with ids it knows. */
export interface RowLabel {
  kind: Kind;
  /** Null for a transfer. */
  categoryId: string | null;
  /** A known Payee by id, or a new one by name. Null for a transfer. */
  payee: PayeeChoice;
  tagIds: string[];
  memberId: string | null;
  /** Null unless the kind is transfer. */
  transfer: TransferTarget | null;
  /** A loan or receivable account that takes an opposite Entry. */
  paysDownAccountId: string | null;
  /** Which answers Jev was unsure of, when it was; else empty. */
  reason: string;
  needsReview: boolean;
}

export type LabelResult =
  { ok: true; label: RowLabel } | { ok: false; problem: string };

type Answers = Readonly<Partial<Record<string, ResultFor<Question>>>>;

class Invalid extends Error {}

function check(condition: unknown, problem: string): asserts condition {
  if (!condition) throw new Invalid(problem);
}

interface Chosen<Value> {
  value: Value;
  /** The probability of the answer as the labeller reads it. */
  probability: number;
  answer: ChoiceResponse;
}

/** The chosen value, with the probability of every label that leads to the same outcome. */
function pick<Value>(
  answers: Answers,
  id: string,
  options: Options<Value> | undefined,
): Chosen<Value> {
  const answer = answers[id];
  check(options && answer?.type === "choice", `No ${id} answer`);
  const value = options.values.get(answer.choice);
  check(value !== undefined, `Unknown ${id} answer`);
  return { value, probability: outcomeProbability(options, answer), answer };
}

/** "Unsure of the category: Food > Groceries 48%, Food > Eating out 31%": the answer, then the strongest other answer. */
function describeDoubt(what: string, answer: ChoiceResponse) {
  const runnerUp = Object.entries(answer.probabilities)
    .filter(([label]) => label !== answer.choice)
    .sort(([, a], [, b]) => b - a)
    .at(0);
  const top = [
    [answer.choice, answer.probabilities[answer.choice] ?? 0] as const,
    ...(runnerUp ? [runnerUp] : []),
  ].map(
    ([label, probability]) =>
      `${label} ${String(Math.round(probability * 100))}%`,
  );
  return `Unsure of the ${what}: ${top.join(", ")}`;
}

/** Reads Jev's answers for one row as labels. */
function toLabel(
  choices: RowChoices,
  tags: readonly TagQuestion[],
  answers: Answers,
): RowLabel {
  const kind = pick(answers, "kind", choices.kind);
  const tagIds = tags.flatMap((tag) => {
    const answer = answers[tag.tagId];
    check(answer?.type === "noul", "No tag answer");
    return answer.noul >= TAG_AT ? [tag.tagId] : [];
  });
  const memberId = choices.member
    ? pick(answers, "member", choices.member).value
    : null;
  const used: [string, Chosen<unknown>][] = [["kind", kind]];
  let label: Omit<RowLabel, "reason" | "needsReview" | "tagIds" | "memberId">;
  if (kind.value === "transfer") {
    const transfer = pick(answers, "transfer", choices.transfer);
    used.push(["other side", transfer]);
    label = {
      kind: "transfer",
      categoryId: null,
      payee: null,
      transfer: transfer.value,
      paysDownAccountId: null,
    };
  } else {
    const categoryOf = `${kind.value}Category` as const;
    const category = pick(answers, categoryOf, choices[categoryOf]);
    const payee = pick(answers, "payee", choices.payee);
    const paysDown = choices.paysDown
      ? pick(answers, "paysDown", choices.paysDown)
      : null;
    used.push(["category", category], ["payee", payee]);
    if (paysDown && paysDown.value !== null) {
      used.push(["loan or money owed", paysDown]);
    }
    label = {
      kind: kind.value,
      categoryId: category.value,
      payee: payee.value,
      transfer: null,
      paysDownAccountId: paysDown?.value ?? null,
    };
  }
  const doubts = used.filter(([, chosen]) => chosen.probability < REVIEW_BELOW);
  return {
    ...label,
    tagIds,
    memberId,
    reason: doubts
      .map(([what, chosen]) => describeDoubt(what, chosen.answer))
      .join("; ")
      .slice(0, MAX_REASON_LENGTH),
    needsReview: doubts.length > 0,
  };
}

/**
 * Asks Jev for the labels of up to 20 bank rows, one request per row. For
 * each row, code first finds the Household's past Transactions with similar
 * bank text and cuts new Payee names from the bank text; Jev only chooses
 * among them. Rows with the same search words share one search. A row
 * whose answer cannot be read comes back with the problem. A failing
 * request throws.
 */
export async function labelBankRows(
  model: LabellingModel,
  context: LabellingContext,
  rows: readonly RowToLabel[],
  search: SearchTransactions,
): Promise<Map<string, LabelResult>> {
  const household = householdQuestions(context);
  const searches = new Map<string, ReturnType<SearchTransactions>>();
  const cachedSearch: SearchTransactions = (input) => {
    const key = JSON.stringify(input);
    let found = searches.get(key);
    if (!found) {
      found = search(input);
      searches.set(key, found);
    }
    return found;
  };
  const results = new Map<string, LabelResult>();
  await forEachLimited(rows, CONCURRENCY, async (row) => {
    const past = await findPastTransactions(cachedSearch, row);
    const choices = rowQuestions(household, row, rows, past);
    const { answers } = await model.systemOne({
      state: rowState(household, row, past),
      questions: requestQuestions(choices, household.tags),
    });
    try {
      results.set(row.ref, {
        ok: true,
        label: toLabel(choices, household.tags, answers),
      });
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      results.set(row.ref, { ok: false, problem: error.message });
    }
  });
  return results;
}
