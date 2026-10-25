import type { MetadataRoute } from "next";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { FINANCE_LIGHT_CANVAS } from "../theme/finance-theme.ts";
import icon192 from "./finance-icon-192.png";
import icon512 from "./finance-icon-512.png";

const COPY = {
  en: {
    name: "Finance",
    description: "The household's accounts, transactions, and reports.",
  },
  zh: {
    name: "家庭账本",
    description: "家庭的账户、交易和报告。",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function buildFinanceManifest(
  locale: SupportedLocale,
): MetadataRoute.Manifest {
  return {
    id: "/finance",
    name: COPY[locale].name,
    short_name: COPY[locale].name,
    description: COPY[locale].description,
    lang: locale,
    start_url: getLocalePath("/finance", locale),
    // The Language preference moves between `/finance` and `/zh/finance`.
    // A narrower scope opens the other language outside the app.
    scope: "/",
    display: "standalone",
    background_color: FINANCE_LIGHT_CANVAS,
    theme_color: FINANCE_LIGHT_CANVAS,
    icons: [
      { src: icon192.src, sizes: "192x192", type: "image/png" },
      { src: icon512.src, sizes: "512x512", type: "image/png" },
      {
        src: icon512.src,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
