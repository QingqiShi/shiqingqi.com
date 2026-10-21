import type { Metadata } from "next";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { buildFinanceManifest } from "./build-finance-manifest.ts";
import appleIcon from "./finance-icon-180.png";
import icon192 from "./finance-icon-192.png";

/** What makes a Finance page add to the home screen as its own app, not as the site. */
export function financeWebAppMetadata(
  locale: SupportedLocale,
): Pick<Metadata, "manifest" | "icons" | "appleWebApp"> {
  return {
    // A path with a dot skips the proxy. The proxy sends a Finance path with
    // no session to sign-in, and a browser gets a manifest without cookies.
    manifest: `/${locale}/finance/manifest.webmanifest`,
    icons: {
      icon: { url: icon192.src, sizes: "192x192", type: "image/png" },
      apple: { url: appleIcon.src, sizes: "180x180", type: "image/png" },
    },
    appleWebApp: { title: buildFinanceManifest(locale).short_name },
  };
}
