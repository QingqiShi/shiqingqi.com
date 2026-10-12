import type { AccountRow } from "../sync/row-schemas.ts";
import { accountQualifiers } from "./account-detail-line.ts";

/**
 * The account's name after its owner and institution, so it stands alone in a
 * list of every account: `Alex Monzo Current account`.
 */
export function accountFullName(
  account: Pick<AccountRow, "name" | "institution">,
  ownerName: string | null,
): string {
  return [...accountQualifiers(account, ownerName), account.name.trim()].join(
    " ",
  );
}
