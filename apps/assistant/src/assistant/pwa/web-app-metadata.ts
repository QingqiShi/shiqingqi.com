import type { SupportedLocale } from "@tuja/i18n/types";
import type { Metadata } from "next";
import icon16 from "./assistant-icon-16.png";
import appleIcon from "./assistant-icon-180.png";
import icon192 from "./assistant-icon-192.png";
import icon32 from "./assistant-icon-32.png";
import { buildManifest } from "./build-manifest.ts";

/** What makes a page add to the home screen as an app. iOS sends Web Push only to such an app. */
export function webAppMetadata(
  locale: SupportedLocale,
): Pick<Metadata, "manifest" | "icons" | "appleWebApp"> {
  return {
    // A path with a dot skips the proxy. The proxy sends a path with no
    // session to sign-in, and a browser gets a manifest without cookies.
    manifest: `/${locale}/manifest.webmanifest`,
    icons: {
      icon: [
        { url: icon16.src, sizes: "16x16", type: "image/png" },
        { url: icon32.src, sizes: "32x32", type: "image/png" },
        { url: icon192.src, sizes: "192x192", type: "image/png" },
      ],
      apple: { url: appleIcon.src, sizes: "180x180", type: "image/png" },
    },
    appleWebApp: { title: buildManifest(locale).short_name },
  };
}
