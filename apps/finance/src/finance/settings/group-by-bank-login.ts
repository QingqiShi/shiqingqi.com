import type { ProviderAccountView } from "../bank/types.ts";

export interface BankLoginGroup {
  bankLoginId: string;
  /** The institution, told apart from another login at the same institution. */
  title: string;
  accounts: ProviderAccountView[];
}

/**
 * A title for each login at one institution, all different. The provider
 * gives a login no name of its own, so a login takes the first account name,
 * in the provider's order, that no other login there has. A login whose names
 * all appear in another login takes its place in the list instead.
 */
function titlesAt(
  institution: string,
  logins: readonly ProviderAccountView[][],
): string[] {
  if (logins.length === 1) return [institution];
  return logins.map((accounts, index) => {
    const unique = accounts.find(
      (account) =>
        !logins.some(
          (other) =>
            other !== accounts &&
            other.some((sibling) => sibling.name === account.name),
        ),
    );
    return unique
      ? `${institution} · ${unique.name}`
      : `${institution} (${String(index + 1)})`;
  });
}

/** The provider accounts by Bank login, in the order the provider lists them. */
export function groupByBankLogin(
  accounts: readonly ProviderAccountView[],
): BankLoginGroup[] {
  const byLogin = new Map<string, ProviderAccountView[]>();
  for (const account of accounts) {
    const members = byLogin.get(account.bankLoginId);
    if (members) members.push(account);
    else byLogin.set(account.bankLoginId, [account]);
  }

  const byInstitution = new Map<string, string[]>();
  for (const [bankLoginId, [first]] of byLogin) {
    const ids = byInstitution.get(first.institution);
    if (ids) ids.push(bankLoginId);
    else byInstitution.set(first.institution, [bankLoginId]);
  }

  const titleOf = new Map<string, string>();
  for (const [institution, ids] of byInstitution) {
    const titles = titlesAt(
      institution,
      ids.map((id) => byLogin.get(id) ?? []),
    );
    for (const [index, id] of ids.entries()) titleOf.set(id, titles[index]);
  }

  return [...byLogin].map(([bankLoginId, members]) => ({
    bankLoginId,
    title: titleOf.get(bankLoginId) ?? "",
    accounts: members,
  }));
}
