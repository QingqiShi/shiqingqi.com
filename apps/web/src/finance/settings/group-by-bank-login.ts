import type { ProviderAccountView } from "../bank/types.ts";

export interface BankLoginGroup {
  bankLoginId: string;
  /** The institution, and the name of the login's first account when another login is at the same institution. */
  title: string;
  accounts: ProviderAccountView[];
}

/**
 * The provider accounts by Bank login, in the order the provider lists them.
 * The provider gives a login no name of its own, so two logins at one
 * institution are told apart by the account each lists first.
 */
export function groupByBankLogin(
  accounts: readonly ProviderAccountView[],
): BankLoginGroup[] {
  const byLogin = new Map<string, ProviderAccountView[]>();
  for (const account of accounts) {
    const members = byLogin.get(account.bankLoginId);
    if (members) members.push(account);
    else byLogin.set(account.bankLoginId, [account]);
  }

  const loginsAt = new Map<string, number>();
  for (const [first] of byLogin.values()) {
    loginsAt.set(first.institution, (loginsAt.get(first.institution) ?? 0) + 1);
  }

  return [...byLogin].map(([bankLoginId, members]) => {
    const [first] = members;
    return {
      bankLoginId,
      title:
        (loginsAt.get(first.institution) ?? 0) > 1
          ? `${first.institution} · ${first.name}`
          : first.institution,
      accounts: members,
    };
  });
}
