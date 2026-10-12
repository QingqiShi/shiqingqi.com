import { LINKABLE_KINDS } from "./linkable-kinds.ts";

/** An account a bank account can be linked to: cash or credit, and not In transit. */
export function isLinkableAccount(account: {
  kind: string;
  isSystem: boolean;
}): boolean {
  return LINKABLE_KINDS.has(account.kind) && !account.isSystem;
}
