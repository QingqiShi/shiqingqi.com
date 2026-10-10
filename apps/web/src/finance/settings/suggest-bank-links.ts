import { LINKABLE_KINDS } from "../domain/accounts/linkable-kinds.ts";

export interface SuggestProviderAccount {
  providerAccountId: string;
  name: string;
  institution: string;
  currency: string | null;
  link: { accountId: string } | null;
}

export interface SuggestFinanceAccount {
  id: string;
  name: string;
  institution: string;
  currency: string;
  kind: string;
  closedOn: string | null;
}

const MIN_NAME_SCORE = 0.3;
const MIN_SCORE = 0.5;
const INSTITUTION_WEIGHT = 0.3;

function tokensOf(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== "");
}

function bigramsOf(text: string): string[] {
  const joined = tokensOf(text).join(" ");
  const bigrams: string[] = [];
  for (let index = 0; index < joined.length - 1; index++) {
    bigrams.push(joined.slice(index, index + 2));
  }
  return bigrams;
}

function dice(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const item of a) counts.set(item, (counts.get(item) ?? 0) + 1);
  let shared = 0;
  for (const item of b) {
    const count = counts.get(item) ?? 0;
    if (count > 0) {
      shared++;
      counts.set(item, count - 1);
    }
  }
  return (2 * shared) / (a.length + b.length);
}

/** How alike two names are, from 0 to 1, ignoring case, punctuation and word order. */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = tokensOf(a);
  const tokensB = tokensOf(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const sortedA = [...tokensA].sort().join(" ");
  const sortedB = [...tokensB].sort().join(" ");
  if (sortedA === sortedB) return 1;
  return Math.max(dice(tokensA, tokensB), dice(bigramsOf(a), bigramsOf(b)));
}

/**
 * The finance account each unlinked provider account most likely feeds:
 * an open cash or credit account in the same currency, not linked already,
 * whose name (and then institution) is most alike. Each finance account is
 * suggested once, best pair first. Returns provider account id → account id.
 */
export function suggestBankLinks(
  providerAccounts: readonly SuggestProviderAccount[],
  accounts: readonly SuggestFinanceAccount[],
): Map<string, string> {
  const taken = new Set(
    providerAccounts.flatMap((provider) =>
      provider.link ? [provider.link.accountId] : [],
    ),
  );
  const candidates = accounts.filter(
    (account) =>
      LINKABLE_KINDS.has(account.kind) &&
      account.closedOn === null &&
      !taken.has(account.id),
  );
  const pairs: { providerId: string; accountId: string; score: number }[] = [];
  for (const provider of providerAccounts) {
    if (provider.link) continue;
    for (const account of candidates) {
      if (provider.currency !== null && provider.currency !== account.currency)
        continue;
      const name = nameSimilarity(provider.name, account.name);
      const institution =
        provider.institution === "" || account.institution === ""
          ? 0
          : nameSimilarity(provider.institution, account.institution);
      const score = name + INSTITUTION_WEIGHT * institution;
      if (name >= MIN_NAME_SCORE && score >= MIN_SCORE) {
        pairs.push({
          providerId: provider.providerAccountId,
          accountId: account.id,
          score,
        });
      }
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const suggestions = new Map<string, string>();
  const used = new Set<string>();
  for (const pair of pairs) {
    if (suggestions.has(pair.providerId) || used.has(pair.accountId)) continue;
    suggestions.set(pair.providerId, pair.accountId);
    used.add(pair.accountId);
  }
  return suggestions;
}
