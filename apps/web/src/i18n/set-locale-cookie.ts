import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "./constants.ts";
import type { SupportedLocale } from "./types.ts";

/**
 * Stores the Language Preference that the server reads. Follow it with a
 * document navigation, not a soft one: every client-router cache — router
 * cache, segment cache, service-worker page caches — is keyed by URL, and an
 * unprefixed URL renders a different Language depending on this cookie. Only a
 * document navigation makes the server read the new Preference, and it leaves
 * no pre-switch entry alive.
 */
export function setLocaleCookie(locale: SupportedLocale) {
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};max-age=${String(LOCALE_COOKIE_MAX_AGE_SECONDS)};path=/;SameSite=Lax${secure}`;
}
