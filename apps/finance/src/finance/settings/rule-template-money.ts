import type { RuleTemplate } from "../rules/rule-template-schema.ts";
import type { AccountRow } from "../sync/row-schemas.ts";

export interface RuleTemplateMoneyInput {
  kind: RuleTemplate["kind"];
  /** The size of each occurrence in the account's minor units, above 0. */
  amountMinor: number;
  accountId: string;
  /** The account a transfer moves money to. */
  toAccountId: string;
  categoryId: string | null;
}

/**
 * The accounts, Entries and Category of a Rule's template: an
 * expense spends the amount from the account, an income earns it into the
 * account, and a transfer moves it to `toAccountId` with no Category.
 * `findAccount` gives only the accounts that the Rule can use.
 */
export function ruleTemplateMoney(
  input: RuleTemplateMoneyInput,
  findAccount: (accountId: string) => AccountRow | undefined,
):
  | { ok: false; error: "account" | "toAccount" | "sameAccount" | "category" }
  | {
      ok: true;
      account: AccountRow;
      /** Null for an expense or income. */
      toAccount: AccountRow | null;
      categoryId: string | null;
      entries: RuleTemplate["entries"];
    } {
  const account = findAccount(input.accountId);
  if (!account) return { ok: false, error: "account" };
  if (input.kind === "transfer") {
    const toAccount = findAccount(input.toAccountId);
    if (!toAccount) return { ok: false, error: "toAccount" };
    if (toAccount.id === account.id) return { ok: false, error: "sameAccount" };
    return {
      ok: true,
      account,
      toAccount,
      categoryId: null,
      entries: [
        { accountId: account.id, amountMinor: -input.amountMinor },
        { accountId: toAccount.id, amountMinor: input.amountMinor },
      ],
    };
  }
  if (input.categoryId === null) return { ok: false, error: "category" };
  const signed =
    input.kind === "expense" ? -input.amountMinor : input.amountMinor;
  return {
    ok: true,
    account,
    toAccount: null,
    categoryId: input.categoryId,
    entries: [{ accountId: account.id, amountMinor: signed }],
  };
}
