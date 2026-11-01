import type { TokenUsage } from "./types.ts";

/**
 * US dollars per million tokens of `claude-haiku-5-5` through the Message
 * Batches API, which costs half the price of single calls.
 */
const PRICE_PER_MILLION: TokenUsage = {
  input: 0.05,
  output: 0.25,
  cacheRead: 0.005,
  cacheWrite: 0.0625,
};

/**
 * The tokens of one mail, as a guess from a sample call: the mail and the
 * categories, the shared instructions and schema from the cache, and the
 * answer. Batches hit the cache less often than single calls, so the input
 * is set high.
 */
const TOKENS_PER_MAIL: Omit<TokenUsage, "cacheWrite"> = {
  input: 1500,
  output: 300,
  cacheRead: 2300,
};

export function costOf(usage: TokenUsage) {
  return (
    (usage.input * PRICE_PER_MILLION.input +
      usage.output * PRICE_PER_MILLION.output +
      usage.cacheRead * PRICE_PER_MILLION.cacheRead +
      usage.cacheWrite * PRICE_PER_MILLION.cacheWrite) /
    1_000_000
  );
}

/** About what the model costs to classify `mails` old mails. */
export function estimateHistoryCost(mails: number) {
  return costOf({
    input: TOKENS_PER_MAIL.input * mails,
    output: TOKENS_PER_MAIL.output * mails,
    cacheRead: TOKENS_PER_MAIL.cacheRead * mails,
    cacheWrite: 0,
  });
}
