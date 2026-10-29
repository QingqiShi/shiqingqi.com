import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";

const FINANCE_HOME = "/";
const BASE = "https://finance.invalid";

/**
 * A `next` value is safe when it is a path on this origin, without a locale
 * prefix. Anything else could send the visitor to another site.
 */
export function safeFinanceNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/")) return FINANCE_HOME;
  if (next.includes("\\") || next.includes("//")) return FINANCE_HOME;
  // A URL parser removes a tab or a newline, so `/\t/evil.example` becomes
  // `//evil.example`. Refuse every control character.
  for (let index = 0; index < next.length; index++) {
    const code = next.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return FINANCE_HOME;
  }
  if (new URL(next, BASE).origin !== BASE) return FINANCE_HOME;
  return next;
}

/** `nextPath` has no locale prefix, e.g. `/transactions?id=…`. */
export function financeSignInPath(
  locale: SupportedLocale,
  nextPath?: string,
): string {
  const signIn = getLocalePath("/sign-in", locale);
  const next = safeFinanceNextPath(nextPath);
  return next === FINANCE_HOME
    ? signIn
    : `${signIn}?next=${encodeURIComponent(next)}`;
}
