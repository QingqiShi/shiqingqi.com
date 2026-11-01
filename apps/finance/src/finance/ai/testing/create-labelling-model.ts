import {
  TypeSafeClient,
  type ChoiceResponse,
  type NoulResponse,
  type Question,
} from "@typesafe-ai/sdk";
import {
  NO_LOAN,
  NO_PAYEE,
  UNKNOWN_ACCOUNT,
  UNKNOWN_MEMBER,
  newPayeeLabel,
  tagInstructions,
} from "../row-questions.ts";

/** One bank row as the fake reads it from the request. */
export interface PromptRow {
  date: string;
  /** Signed, in major units, with the currency: "-12.34 GBP". */
  amount: string;
  merchant: string;
  description: string;
}

/** The fake's answer for one row, by the labels Jev sees; fields left out take a plain default. */
export interface ModelAnswer {
  kind?: "expense" | "income" | "transfer";
  /** The Category's name, or its path. The default is the first Category offered. */
  category?: string;
  /** A known Payee's name, a new name as cut from the bank text, or null. */
  payee?: string | null;
  tags?: string[];
  member?: string;
  /** An account's name, a bank row of the batch as `pairLabel` names it, or "unknown". */
  transfer?: string;
  paysDown?: string;
  /** The probability of every chosen answer; 1 when left out. */
  probability?: number;
}

/** A request as the fake received it. */
interface LabellingRequest {
  state: {
    household_instructions: string;
    bank_row: Record<string, unknown> & PromptRow;
    past_transactions_with_similar_bank_text: unknown;
  };
  questions: Record<string, Question>;
}

/** The labels a Choice question offers, in order. */
export function offeredLabels(question: Question | undefined) {
  return question?.type === "choice" ? Object.keys(question.criteria) : [];
}

function labelFor(
  labels: readonly string[],
  wanted: string | undefined,
  fallback: string,
) {
  if (wanted === undefined)
    return labels.includes(fallback) ? fallback : labels[0];
  return (
    labels.find(
      (label) =>
        label === wanted ||
        label === newPayeeLabel(wanted) ||
        label.endsWith(` > ${wanted}`),
    ) ?? wanted
  );
}

/** Tests run in jsdom, which the client thinks is a browser. The key is not a real key. */
export const TEST_CLIENT = {
  apiKey: "test",
  compression: false,
  logLevel: "off",
  retry: { maxRetries: 0 },
  dangerouslyAllowBrowser: true,
} as const;

function choiceAnswer(
  labels: readonly string[],
  chosen: string,
  probability: number,
): ChoiceResponse {
  const rest = labels.filter((label) => label !== chosen);
  const share = rest.length === 0 ? 0 : (1 - probability) / rest.length;
  const probabilities: Record<string, number> = { [chosen]: probability };
  for (const label of rest) probabilities[label] = share;
  return {
    type: "choice",
    choice: chosen,
    confidence: probability,
    probabilities,
  };
}

function answersFor(request: LabellingRequest, given: ModelAnswer | null) {
  const answer: ModelAnswer = given ?? {};
  const probability = answer.probability ?? 1;
  const choose = (id: string, wanted: string | undefined, fallback = "") =>
    choiceAnswer(
      offeredLabels(request.questions[id]),
      labelFor(offeredLabels(request.questions[id]), wanted, fallback),
      probability,
    );
  const transfer =
    answer.transfer === "unknown" ? UNKNOWN_ACCOUNT : answer.transfer;
  const answers: Record<string, ChoiceResponse | NoulResponse> = {};
  for (const [id, question] of Object.entries(request.questions)) {
    if (question.type === "noul") {
      const wanted = (answer.tags ?? []).some(
        (tag) => question.instructions === tagInstructions(tag),
      );
      answers[id] = { type: "noul", noul: wanted ? probability : 0 };
      continue;
    }
    switch (id) {
      case "kind":
        answers[id] = choose(
          id,
          given === null ? "unreadable" : (answer.kind ?? "expense"),
        );
        break;
      case "expenseCategory":
      case "incomeCategory":
        answers[id] = choose(id, answer.category);
        break;
      case "payee":
        answers[id] = choose(
          id,
          answer.payee === null ? NO_PAYEE : answer.payee,
          NO_PAYEE,
        );
        break;
      case "transfer":
        answers[id] = choose(id, transfer, UNKNOWN_ACCOUNT);
        break;
      case "paysDown":
        answers[id] = choose(id, answer.paysDown, NO_LOAN);
        break;
      default:
        answers[id] = choose(id, answer.member, UNKNOWN_MEMBER);
    }
  }
  return answers;
}

/**
 * A fake Jev behind the real client: it answers each request for a bank row
 * with what `answer` gives, and with an unreadable answer when `answer`
 * gives null. `requests` holds every request it received.
 */
export function createLabellingModel(
  answer: (row: PromptRow) => ModelAnswer | null,
) {
  const requests: LabellingRequest[] = [];
  const client = new TypeSafeClient({
    ...TEST_CLIENT,
    fetch: (_url, init) => {
      const body = typeof init?.body === "string" ? init.body : "{}";
      const request = JSON.parse(body) as LabellingRequest;
      requests.push(request);
      const row = request.state.bank_row;
      const prompt: PromptRow = {
        date: row.date,
        amount: row.amount,
        merchant: row.merchant === "-" ? "" : row.merchant,
        description: row.description === "-" ? "" : row.description,
      };
      return Promise.resolve(
        Response.json({
          model: "jev-test",
          answers: answersFor(request, answer(prompt)),
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    },
  });
  return Object.assign(client, { requests });
}

/** A Jev that fails every request, as an overloaded service does. */
export function createFailingLabellingModel() {
  return new TypeSafeClient({
    ...TEST_CLIENT,
    fetch: () =>
      Promise.resolve(Response.json({ error: "overloaded" }, { status: 529 })),
  });
}
