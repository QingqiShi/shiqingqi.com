import { serwist } from "@serwist/next/config";

/** @typedef {{ url: string; revision: string | null; integrity?: string }} ManifestEntry */

export default await serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  precachePrerendered: true,
  globIgnores: [
    "**/_global-error*",
    "**/pwa-*.png",
    "**/vercel.svg",
    "**/next.svg",
  ],
  manifestTransforms: [
    /** @param {ManifestEntry[]} entries */
    (entries) => {
      // Transform /en routes to canonical URLs (without locale prefix)
      // .next/server/app/en.html → .next/server/app/index.html (becomes /)
      // .next/server/app/en/foo.html → .next/server/app/foo.html (becomes /foo)
      const manifest = entries.map((entry) => {
        if (entry.url === ".next/server/app/en.html") {
          return { ...entry, url: ".next/server/app/index.html" };
        }
        if (entry.url.startsWith(".next/server/app/en/")) {
          return {
            ...entry,
            url: entry.url.replace(".next/server/app/en/", ".next/server/app/"),
          };
        }
        return entry;
      });
      return { manifest, warnings: /** @type {string[]} */ ([]) };
    },
  ],
});
