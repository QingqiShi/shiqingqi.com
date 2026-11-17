import { createHash } from "node:crypto";
import { globSync, readFileSync } from "node:fs";
import { serwist } from "@serwist/next/config";

/**
 * The precache entry of the offline page of a locale, with a revision from
 * its prerendered HTML. The service worker serves this page on a navigation
 * that has no network and no copy, so a build without it must fail.
 *
 * @param {"en" | "zh"} locale
 */
function offlinePage(locale) {
  // On Vercel, the build adapter of Next puts prerendered HTML in
  // `.next/server/route-cache/`, not in `.next/server/app/`, where the
  // `precachePrerendered` option of Serwist finds it. Thus look in both.
  const [file] = globSync(`.next/server/**/${locale}/~offline.html`);
  if (!file) {
    throw new Error(
      `The prerendered /${locale}/~offline page is missing, so the service worker would have no offline page.`,
    );
  }
  return {
    url: `/${locale}/~offline`,
    revision: createHash("md5").update(readFileSync(file)).digest("hex"),
  };
}

export default await serwist({
  swSrc: "src/pwa/sw.ts",
  swDest: "public/sw.js",
  // Trip pages are force-dynamic, so the only prerendered HTML worth
  // precaching is the offline page, named here.
  precachePrerendered: false,
  additionalPrecacheEntries: [offlinePage("en"), offlinePage("zh")],
});
