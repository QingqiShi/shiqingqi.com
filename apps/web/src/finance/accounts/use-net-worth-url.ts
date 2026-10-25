import { usePathname, useSearchParams } from "next/navigation";
import { hrefWithParams } from "../shell/href-with-params.ts";

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const account = searchParams.get("account");
  const tx = account === null ? null : searchParams.get("tx");

  return {
    account,
    tx,
    mode: searchParams.get("mode"),
    /** The URL of the screen with this account and Transaction picked. */
    hrefOf({ account: nextAccount, tx: nextTx = null }: NetWorthPick) {
      const params = new URLSearchParams(searchParams);
      params.delete("mode");
      if (nextAccount === null) params.delete("account");
      else params.set("account", nextAccount);
      if (nextAccount === null || nextTx === null) params.delete("tx");
      else params.set("tx", nextTx);
      return hrefWithParams(pathname, params);
    },
    /**
     * The URL of the screen in a mode, `"update"` or `"reorder"`, or back in
     * none. "Update balances" is for every account, so it drops the account.
     */
    modeHref(mode: "update" | "reorder" | null) {
      const params = new URLSearchParams(searchParams);
      params.delete("tx");
      if (mode === "update") params.delete("account");
      if (mode === null) params.delete("mode");
      else params.set("mode", mode);
      return hrefWithParams(pathname, params);
    },
  };
}
