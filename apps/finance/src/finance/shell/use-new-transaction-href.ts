import { useLocale } from "@tuja/i18n/use-locale";
import { useTabViewOpening } from "@tuja/ui/components/tab-view";
import { usePathname, useSearchParams } from "next/navigation";
import { financeHref } from "../navigation/finance-href.ts";

/**
 * The href of a blank expense (`?new=expense`) in a sheet over the screen
 * that shows, which keeps its own state, such as the account whose page
 * shows. While a screen still opens, it is that screen, with no state.
 */
export function useNewTransactionHref() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const opening = useTabViewOpening();
  return financeHref(
    { screen: "current", newTransaction: { kind: "expense" } },
    locale,
    opening === null
      ? { pathname, search: searchParams.toString() }
      : { pathname: opening, search: "" },
  );
}
