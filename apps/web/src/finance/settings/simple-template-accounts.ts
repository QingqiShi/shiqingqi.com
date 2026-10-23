import type { RuleTemplate } from "../rules/rule-template-schema.ts";

/** The accounts of a template in the simple shape the Rule form can edit. */
export interface TemplateAccounts {
  /** The account an expense spends from, an income earns into, or a transfer moves money from. */
  accountId: string;
  /** The account a transfer moves money to; empty for an expense or income. */
  toAccountId: string;
}

/**
 * The accounts of a template whose Entries have the simple shape: one Entry
 * for an expense or income, two for a transfer, all in the base currency.
 * Null for any other shape (several accounts, or an account in another
 * currency), so its amount and accounts are edited on a Transaction instead.
 */
export function simpleTemplateAccounts(
  template: RuleTemplate,
  isBaseCurrency: (accountId: string) => boolean,
): TemplateAccounts | null {
  if (!template.entries.every((entry) => isBaseCurrency(entry.accountId))) {
    return null;
  }
  const [from, to] = template.entries;
  if (template.kind === "transfer") {
    if (template.entries.length !== 2) return null;
    return { accountId: from.accountId, toAccountId: to.accountId };
  }
  if (template.entries.length !== 1) return null;
  return { accountId: from.accountId, toAccountId: "" };
}

/** The size of a template's movement in its first account's currency, always positive. */
export function templateAmount(template: RuleTemplate): number {
  return Math.abs(template.entries[0]?.amountMinor ?? 0);
}
