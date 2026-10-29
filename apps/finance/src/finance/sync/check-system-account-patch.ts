import { MutationError } from "./mutation-error.ts";

/** The fields of In transit a member may change: where it sits on the balance sheet. */
const SYSTEM_ACCOUNT_FIELDS: ReadonlySet<string> = new Set([
  "groupId",
  "position",
]);

/** Throws unless the patch only moves In transit, the system account. */
export function checkSystemAccountPatch(
  fields: object,
  deleted: boolean | undefined,
) {
  if (
    deleted === true ||
    Object.keys(fields).some((field) => !SYSTEM_ACCOUNT_FIELDS.has(field))
  ) {
    throw new MutationError("invalid", "In transit can only be moved");
  }
}

/** Throws for a Valuation on In transit: its balance comes from Entries only. */
export function checkSystemAccountValuation(account: { isSystem: boolean }) {
  if (account.isSystem) {
    throw new MutationError("invalid", "In transit takes no Valuation");
  }
}
