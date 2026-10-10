interface RankablePayee {
  id: string;
  name: string;
}

interface RankPayeesOptions {
  /** The last day each Payee was used; a Payee not in it was never used. */
  lastUsedById: ReadonlyMap<string, string>;
  limit?: number;
}

/** Lower case, full-width folded, no surrounding space. */
export function normalisePayeeText(text: string) {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

/** True when every character of `query` appears in `text` in order. */
function isSubsequence(query: string, text: string) {
  let index = 0;
  for (const char of text) {
    if (char === query[index]) index++;
    if (index === query.length) return true;
  }
  return false;
}

/** 0 for a prefix, 1 for a word prefix, 2 for a substring, 3 for a fuzzy match, null for none. */
function matchTier(query: string, name: string) {
  if (name.startsWith(query)) return 0;
  if (name.split(/[\s\-_/·.&]+/).some((word) => word.startsWith(query))) {
    return 1;
  }
  if (name.includes(query)) return 2;
  if (query.length >= 2 && isSubsequence(query.replaceAll(" ", ""), name)) {
    return 3;
  }
  return null;
}

/**
 * The Payees the combobox offers for `query`. With no query: the most
 * recently used. With a query: prefix matches, then word-prefix, substring
 * and fuzzy matches; inside each tier the most recently used come first.
 */
export function rankPayees<Payee extends RankablePayee>(
  query: string,
  payees: readonly Payee[],
  { lastUsedById, limit = 8 }: RankPayeesOptions,
): Payee[] {
  const wanted = normalisePayeeText(query);
  const recency = (payee: Payee) => lastUsedById.get(payee.id) ?? "";
  const byRecency = (a: Payee, b: Payee) => {
    const dayA = recency(a);
    const dayB = recency(b);
    if (dayA !== dayB) return dayA < dayB ? 1 : -1;
    return a.name.localeCompare(b.name);
  };

  if (wanted === "") {
    return payees
      .filter((payee) => lastUsedById.has(payee.id))
      .sort(byRecency)
      .slice(0, limit);
  }

  const tiers: Payee[][] = [[], [], [], []];
  for (const payee of payees) {
    const tier = matchTier(wanted, normalisePayeeText(payee.name));
    if (tier !== null) tiers[tier].push(payee);
  }
  const ranked: Payee[] = [];
  for (const tier of tiers) {
    for (const payee of tier.sort(byRecency)) {
      ranked.push(payee);
      if (ranked.length === limit) return ranked;
    }
  }
  return ranked;
}
