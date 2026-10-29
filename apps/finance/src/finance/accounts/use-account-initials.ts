import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountInitials } from "./account-initials.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";

/**
 * The initials of each account of the balance sheet, by account id, which
 * tell the accounts apart. The list and its narrow strip show the same
 * initials, so that an account keeps its mark when the list folds.
 */
export function useAccountInitials(sheet: BalanceSheet) {
  const accountName = useAccountDisplayName();
  const accounts = sheet.sections.flatMap((section) =>
    section.lines.map((line) => line.account),
  );
  const initials = accountInitials(accounts.map(accountName));
  return new Map(
    accounts.map((account, index) => [account.id, initials[index]]),
  );
}
