import { comparableText, type ComparableText } from "./comparable-text.ts";
import { scoreTextSimilarity } from "./score-text-similarity.ts";
import type { LabelMemory } from "./types.ts";

/** The lowest history score that names a Payee. */
const HISTORY_MATCH_THRESHOLD = 0.6;

type PayeeMemory = Pick<LabelMemory, "aliases" | "payees">;

interface Candidate {
  payeeId: string;
  text: ComparableText;
}

const candidatesByMemory = new WeakMap<PayeeMemory, Candidate[]>();

/** The names and aliases of the live Payees, prepared once for each memory. */
function candidatesOf(memory: PayeeMemory, live: ReadonlySet<string>) {
  const cached = candidatesByMemory.get(memory);
  if (cached) return cached;
  const candidates = [
    ...memory.payees.map((payee) => ({ payeeId: payee.id, text: payee.name })),
    ...memory.aliases
      .filter((alias) => live.has(alias.payeeId))
      .map((alias) => ({ payeeId: alias.payeeId, text: alias.alias })),
  ].map(({ payeeId, text }) => ({ payeeId, text: comparableText(text) }));
  candidatesByMemory.set(memory, candidates);
  return candidates;
}

interface PayeeMatch {
  payeeId: string;
  source: "alias" | "history";
  /** 1 for an alias hit; the similarity score for a history hit. */
  score: number;
}

/**
 * Finds the Payee a bank text names: first an exact alias hit, then the
 * Payee whose name or alias is most alike, when it scores at least 0.6.
 */
export function matchPayee(
  text: string,
  memory: PayeeMemory,
): PayeeMatch | null {
  const input = comparableText(text);
  if (input.normalised === "") return null;
  const live = new Set(memory.payees.map((payee) => payee.id));

  for (const alias of memory.aliases) {
    if (alias.alias === input.normalised && live.has(alias.payeeId)) {
      return { payeeId: alias.payeeId, source: "alias", score: 1 };
    }
  }

  let best: PayeeMatch | null = null;
  for (const candidate of candidatesOf(memory, live)) {
    const score = scoreTextSimilarity(input, candidate.text);
    if (score >= HISTORY_MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { payeeId: candidate.payeeId, source: "history", score };
    }
  }
  return best;
}
