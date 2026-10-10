import type { AccountRow } from "../sync/row-schemas.ts";

/**
 * The owner and institution that tell apart accounts with the same name,
 * such as two "Savings" accounts: `Alex · Example Bank`. Empty when neither is set.
 */
export function accountDetailLine(
  account: Pick<AccountRow, "name" | "institution">,
  ownerName: string | null,
): string {
  const institution = account.institution.trim();
  const parts = [ownerName ?? ""];
  if (
    institution !== "" &&
    institution.toLocaleLowerCase() !== account.name.trim().toLocaleLowerCase()
  ) {
    parts.push(institution);
  }
  return parts.filter((part) => part !== "").join(" · ");
}
