import type { ProviderAccountView, PutBankLinkRequest } from "../bank/types.ts";

/** What one provider account should feed: an account id ("" for none) and whether the bank's sign is flipped. */
export interface BankLinkChoice {
  accountId: string;
  flipped: boolean;
}

/** The choice a provider account's current Bank link stands for. */
export function choiceOf(account: ProviderAccountView): BankLinkChoice {
  return {
    accountId: account.link?.accountId ?? "",
    flipped: account.link?.signMultiplier === -1,
  };
}

export function isSameChoice(a: BankLinkChoice, b: BankLinkChoice) {
  return a.accountId === b.accountId && a.flipped === b.flipped;
}

interface BankLinkPlan {
  /** Bank link ids to remove, first, so that a provider account is free before it moves. */
  removals: string[];
  puts: PutBankLinkRequest[];
}

/** The requests that turn the current Bank links into `choices`; a provider account without a choice stays. */
export function planBankLinkChanges(
  accounts: readonly ProviderAccountView[],
  choices: ReadonlyMap<string, BankLinkChoice>,
): BankLinkPlan {
  const plan: BankLinkPlan = { removals: [], puts: [] };
  for (const account of accounts) {
    const choice = choices.get(account.providerAccountId);
    if (!choice || isSameChoice(choice, choiceOf(account))) continue;
    if (account.link && account.link.accountId !== choice.accountId) {
      plan.removals.push(account.link.id);
    }
    if (choice.accountId !== "") {
      plan.puts.push({
        accountId: choice.accountId,
        providerAccountId: account.providerAccountId,
        signMultiplier: choice.flipped ? -1 : 1,
      });
    }
  }
  return plan;
}
