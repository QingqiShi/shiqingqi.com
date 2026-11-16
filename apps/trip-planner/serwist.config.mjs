import { serwist } from "@serwist/next/config";

const config = await serwist({
  swSrc: "src/pwa/sw.ts",
  swDest: "public/sw.js",
  // Trip pages are force-dynamic, so there is no prerendered HTML worth
  // precaching except the ~offline fallback documents, which must be in the
  // precache for the service worker to serve them on uncached navigations.
  precachePrerendered: true,
});

// The English pages have no locale prefix, so the English fallback is stored
// under `/~offline`, the URL that serves it. This transform runs after the
// one that turns the file paths into URLs.
config.manifestTransforms.push((entries) => ({
  manifest: entries.map((entry) =>
    entry.url === "/en/~offline" ? { ...entry, url: "/~offline" } : entry,
  ),
  warnings: [],
}));

export default config;
