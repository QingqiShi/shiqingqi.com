import type { SupportedLocale } from "@tuja/i18n/types";
import type { Metadata } from "next";
import { buildFinanceManifest } from "./build-finance-manifest.ts";
import icon16 from "./finance-icon-16.png";
import appleIcon from "./finance-icon-180.png";
import icon192 from "./finance-icon-192.png";
import icon32 from "./finance-icon-32.png";

/** What makes a Finance page add to the home screen as its own app, not as the site. */
export function financeWebAppMetadata(
  locale: SupportedLocale,
): Pick<Metadata, "manifest" | "icons" | "appleWebApp"> {
  return {
    // A path with a dot skips the proxy. The proxy sends a Finance path with
    // no session to sign-in, and a browser gets a manifest without cookies.
    manifest: `/${locale}/finance/manifest.webmanifest`,
    icons: {
      // The 16px and 32px icons align to the pixel grid. When a browser tab
      // makes the 192px icon smaller, the coin slot of the mark becomes blurred.
      icon: [
        { url: icon16.src, sizes: "16x16", type: "image/png" },
        { url: icon32.src, sizes: "32x32", type: "image/png" },
        { url: icon192.src, sizes: "192x192", type: "image/png" },
      ],
      apple: { url: appleIcon.src, sizes: "180x180", type: "image/png" },
    },
    appleWebApp: { title: buildFinanceManifest(locale).short_name },
  };
}
