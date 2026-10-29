import type { RuleTemplate } from "../rules/rule-template-schema.ts";

/**
 * Whether a Rule with these template Entries may post automatically. Bank
 * sync imports the real Transactions of an account with a live Bank link, so
 * a Rule on one makes Expected Transactions for the bank rows to confirm.
 */
export function mayAutoPost(
  entries: readonly Pick<RuleTemplate["entries"][number], "accountId">[],
  hasBankLink: (accountId: string) => boolean,
) {
  return !entries.some(({ accountId }) => hasBankLink(accountId));
}
