import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { usePathname, useSearchParams } from "next/navigation";
import { financeHref } from "../navigation/finance-href.ts";
import { useShownFinancePath } from "./finance-screen-slot.tsx";

/**
 * The href of a blank expense (`?new=expense`) in a sheet over the screen
 * that shows, which keeps its own state, such as the account whose page
 * shows. While a screen still opens, it is that screen, with no state.
 */
export function useNewTransactionHref() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shownPath = useShownFinancePath();
  const opening = shownPath !== normalizePath(pathname);
  return financeHref(
    { screen: "current", newTransaction: { kind: "expense" } },
    locale,
    opening
      ? { pathname: getLocalePath(shownPath, locale), search: "" }
      : { pathname, search: searchParams.toString() },
  );
}
