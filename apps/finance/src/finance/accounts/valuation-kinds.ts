import type { AccountKind } from "../domain/accounts/side-of-kind.ts";

/** Kinds whose balance moves by Valuations rather than by Entries: the ones "Update balances" lists. */
export const VALUATION_KINDS: ReadonlySet<AccountKind> = new Set([
  "investment",
  "property",
  "loan",
  "receivable",
]);
