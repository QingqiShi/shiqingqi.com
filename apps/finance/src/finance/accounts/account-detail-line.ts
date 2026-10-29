import type { AccountRow } from "../sync/row-schemas.ts";

/**
 * The owner and institution that tell the account apart, leaving out a part
 * that is empty or that the name already holds.
 */
export function accountQualifiers(
  account: Pick<AccountRow, "name" | "institution">,
  ownerName: string | null,
): string[] {
  const lowerName = account.name.trim().toLocaleLowerCase();
  return [ownerName ?? "", account.institution]
    .map((part) => part.trim())
    .filter(
      (part) => part !== "" && !lowerName.includes(part.toLocaleLowerCase()),
    );
}

/**
 * The owner and institution that tell apart accounts with the same name,
 * such as two "Savings" accounts: `Alex · Example Bank`. Empty when neither is set.
 */
export function accountDetailLine(
  account: Pick<AccountRow, "name" | "institution">,
  ownerName: string | null,
): string {
  return accountQualifiers(account, ownerName).join(" · ");
}
