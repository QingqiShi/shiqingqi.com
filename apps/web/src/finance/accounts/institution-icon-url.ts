import { institutionDomainOf } from "../domain/accounts/institution-fields-after.ts";
import type { AccountRow } from "../sync/row-schemas.ts";

/** The URL of the account's institution icon; undefined when it has no domain. */
export function institutionIconUrl(
  account: Pick<AccountRow, "institutionDomain" | "guessedInstitutionDomain">,
) {
  const domain = institutionDomainOf(account);
  return domain === null
    ? undefined
    : `/api/finance/institution-icons/${encodeURIComponent(domain)}`;
}
