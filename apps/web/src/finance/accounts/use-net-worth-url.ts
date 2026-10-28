import { useSearchParams } from "next/navigation";
import { useLocale } from "#src/i18n/use-locale.ts";
import {
  financeHref,
  readNetWorth,
  type NetWorthMode,
} from "../navigation/finance-href.ts";

interface NetWorthPick {
  /** The account in the content column, or null for the Household. */
  account: string | null;
  /** The Transaction in the detail column, from the account's Ledger. */
  tx?: string | null;
}

/** The Net worth screen's state in the URL, and the links that change it. */
export type NetWorthUrl = ReturnType<typeof useNetWorthUrl>;

/**
 * The Net worth screen's state in the URL: `?account=` for the account in
 * the content column, and `&tx=` for a Transaction of its Ledger in the
 * detail column. A reload keeps both. Read it once for a screen, and give
 * each row its link and whether it is picked.
 */
export function useNetWorthUrl() {
  const locale = useLocale();
  const { account, tx, mode } = readNetWorth(useSearchParams());

  return {
    account,
    tx,
    mode,
    /** The URL of the screen with this account and Transaction picked. */
    hrefOf(pick: NetWorthPick) {
      return financeHref({ screen: "netWorth", ...pick }, locale);
    },
    /**
     * The URL of the screen in a mode, or back in none. "Update balances" is
     * for every account, so it drops the account.
     */
    modeHref(nextMode: NetWorthMode | null) {
      return financeHref(
        {
          screen: "netWorth",
          account: nextMode === "update" ? null : account,
          mode: nextMode,
        },
        locale,
      );
    },
  };
}
