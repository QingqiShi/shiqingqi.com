import { institutionDomainOf } from "../domain/accounts/institution-fields-after.ts";
import type { AccountRow } from "../sync/row-schemas.ts";

/**
 * The URL of the account's institution icon; undefined when the server has
 * no icon for its domain. The version in the URL lets a new icon replace the
 * one that the browser holds.
 */
export function institutionIconUrl(
  account: Pick<
    AccountRow,
    "institutionDomain" | "guessedInstitutionDomain" | "institutionIconVersion"
  >,
) {
  const domain = institutionDomainOf(account);
  if (domain === null || account.institutionIconVersion === null) {
    return undefined;
  }
  return `/api/institution-icons/${encodeURIComponent(domain)}?v=${encodeURIComponent(account.institutionIconVersion)}`;
}
