import {
  choice,
  type ChoiceQuestion,
  type ChoiceResponse,
  type EntryType,
} from "@typesafe-ai/sdk";

/** A Choice question can have at most this many options. */
const MAX_OPTIONS = 255;

/** A Choice question, and what each of its labels stands for. */
export interface Options<Value> {
  question: ChoiceQuestion;
  values: ReadonlyMap<string, Value>;
  /** Labels that lead to the same outcome share a key, so their probabilities add up. */
  outcomes: ReadonlyMap<string, string>;
}

export interface Option<Value> {
  label: string;
  description: EntryType;
  value: Value;
  /** Defaults to the value. */
  outcome?: string;
}

/** The probability of every label that leads to the same outcome as the chosen one. */
export function outcomeProbability(
  options: Options<unknown>,
  answer: ChoiceResponse,
) {
  const outcome = options.outcomes.get(answer.choice);
  let probability = 0;
  for (const [label, each] of options.outcomes) {
    if (each === outcome) probability += answer.probabilities[label] ?? 0;
  }
  return probability;
}

export function optionsOf<Value>(
  instructions: string,
  options: readonly Option<Value>[],
): Options<Value> {
  const criteria: Record<string, EntryType> = {};
  const values = new Map<string, Value>();
  const outcomes = new Map<string, string>();
  for (const option of options.slice(0, MAX_OPTIONS)) {
    let label = option.label.trim() || "?";
    for (let n = 2; values.has(label); n++) {
      label = `${option.label} (${String(n)})`;
    }
    criteria[label] = option.description;
    values.set(label, option.value);
    outcomes.set(label, option.outcome ?? JSON.stringify(option.value));
  }
  return { question: choice(instructions, criteria), values, outcomes };
}
