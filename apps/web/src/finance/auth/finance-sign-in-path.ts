import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";

const FINANCE_HOME = "/finance";

/**
 * A `next` value is safe when it is a path inside finance, without a locale
 * prefix. Anything else could send the visitor to another site.
 */
export function safeFinanceNextPath(next: string | null | undefined): string {
  if (!next) return FINANCE_HOME;
  if (next !== FINANCE_HOME && !/^\/finance[/?#]/.test(next)) {
    return FINANCE_HOME;
  }
  if (next.includes("\\") || next.includes("//")) return FINANCE_HOME;
  return next;
}

/** `nextPath` has no locale prefix, e.g. `/finance/transactions?id=…`. */
export function financeSignInPath(
  locale: SupportedLocale,
  nextPath?: string,
): string {
  const signIn = getLocalePath("/finance/sign-in", locale);
  const next = safeFinanceNextPath(nextPath);
  return next === FINANCE_HOME
    ? signIn
    : `${signIn}?next=${encodeURIComponent(next)}`;
}
