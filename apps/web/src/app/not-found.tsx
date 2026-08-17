import type { Metadata, Viewport } from "next";
import { globalStyles } from "#src/app/global-styles.ts";
import { InlineScript } from "#src/components/shared/inline-script.tsx";
import { NotFoundScreen } from "#src/components/shared/not-found-screen.tsx";
import { setLocale } from "#src/i18n/server-locale.ts";
import { i18nConfig } from "#src/i18n-config.ts";
import { themeHack } from "#src/utils/theme-hack.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

/**
 * The Locale this screen commits to.
 *
 * App Router places the root `not-found.tsx` above the `[locale]` segment, so it
 * gets no `locale` param — and it has to stay prerenderable. A mistyped URL is
 * rejected by the router before the app renders, and that path serves the
 * prerendered 404, so reaching for `headers()` or `cookies()` to sniff the Locale
 * makes the route dynamic and Next answers those URLs with its own bare error
 * document instead of this screen (verified against a production build). So it
 * picks the default language and commits to it, rather than the previous screen's
 * habit of printing English and Chinese side by side.
 * `[locale]/not-found.tsx` covers the 404s that do have a Locale to read.
 */
const fallbackLocale = validateLocale(i18nConfig.defaultLocale);

// `[locale]/layout.tsx` is not an ancestor of this route, so its `viewport` does
// not apply here and has to be repeated. Without `viewportFit: "cover"` every
// `env(safe-area-inset-*)` in the Shell resolves to 0 and the header chrome this
// screen exists to restore sits under the notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Page not found | Qingqi Shi",
  description:
    "This page doesn't exist. Head back to the home page or pick another Project.",
  // Belt-and-braces with the 404 status code — compliant crawlers already
  // drop the URL on status, but non-compliant AI scrapers and social-preview
  // unfurlers read metadata regardless. `noindex, nofollow` keeps the
  // title/description out of those pipelines. Mirrors PR #2190's playground.
  robots: { index: false, follow: false },
};

/**
 * The 404 for a URL that matches no route at all.
 *
 * `app/layout.tsx` exists only to load `global.css` and renders no document, so
 * this screen supplies what `[locale]/layout.tsx` would have: the `<html>`/`<body>`
 * pair and the Theme script that runs before hydration. It needs none of that
 * layout's providers — nothing the 404 renders reads the portal target, the back
 * override, or the Locale context, and the two hooks that do have safe defaults.
 *
 * Stays synchronous on purpose — see `fallbackLocale`.
 */
export default function RootNotFound() {
  // Primes the server `t()` lookup, the way `[locale]/layout.tsx` primes it from
  // the route on every other page. `NotFoundScreen` reads the Locale back out.
  setLocale(fallbackLocale);

  return (
    <html lang={fallbackLocale} suppressHydrationWarning>
      <body css={globalStyles.body}>
        {/* Theme initialization before hydration */}
        <InlineScript html={themeHack} />
        <NotFoundScreen />
      </body>
    </html>
  );
}
