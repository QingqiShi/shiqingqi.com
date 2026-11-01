import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";

const HOME = "/";
const BASE = "https://assistant.invalid";

/**
 * A `next` value is safe when it is a path on this origin, without a locale
 * prefix. Anything else could send the visitor to another site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/")) return HOME;
  if (next.includes("\\") || next.includes("//")) return HOME;
  // A URL parser removes a tab or a newline, so `/\t/evil.example` becomes
  // `//evil.example`. Refuse every control character.
  for (let index = 0; index < next.length; index++) {
    const code = next.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return HOME;
  }
  if (new URL(next, BASE).origin !== BASE) return HOME;
  return next;
}

/** `nextPath` has no locale prefix, e.g. `/settings?tab=…`. */
export function signInPath(locale: SupportedLocale, nextPath?: string): string {
  const signIn = getLocalePath("/sign-in", locale);
  const next = safeNextPath(nextPath);
  return next === HOME ? signIn : `${signIn}?next=${encodeURIComponent(next)}`;
}
